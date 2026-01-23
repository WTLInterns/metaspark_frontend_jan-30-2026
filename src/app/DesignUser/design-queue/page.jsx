"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as orderApi from "../orders/api";
import PdfRowOverlayViewer from "@/components/PdfRowOverlayViewer";

/* ✅ DetailsPanel unchanged */
function DetailsPanel({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50">
      <div className="absolute inset-y-0 right-0 w-full lg:w-4/5 bg-gray-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">Order #{order.id}</h2>
            <p className="text-sm text-black">
              Track the progress of the order from inquiry to completion.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="m-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {["Inquiry", "Design", "Production", "Machining", "Inspection", "Completed"].map(
              (step, i) => (
                <div key={step} className="flex-1 flex items-center">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full border ${
                      order.status === step
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 5 && <div className="flex-1 h-px bg-gray-300 mx-2" />}
                </div>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-black">Project Details</h3>
                <button className="text-black hover:text-black">✎</button>
              </div>

              <div className="mb-4">
                <div className="text-xs text-black mb-1">Products</div>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-black">
                  {Array.isArray(order.products)
                    ? order.products
                        .map((p) => p && (p.productName || p.productCode))
                        .filter(Boolean)
                        .join(', ')
                    : order.products && typeof order.products === 'object'
                      ? (order.products.productName || order.products.productCode || 'No Product')
                      : (order.products || 'No Product')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-black mb-1">Customer</div>
                  <div className="text-black">{order.customer}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Date Created</div>
                  <div className="text-black">{order.date}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Status</div>
                  <div className="text-black">{order.status}</div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Status History</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-black">Order Created</div>
                    <div className="text-xs text-gray-500">{order.date} by System</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignQueuePage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState({ message: "", type: "" });

  const [orders, setOrders] = useState([]);
  const [pdfMap, setPdfMap] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);

  const [pdfType, setPdfType] = useState("standard"); // ✅ "standard" | "nesting"
  const [activePdfTab, setActivePdfTab] = useState("subnest");

  const [isRowsLoading, setIsRowsLoading] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);

  const fileInputRef = useRef(null);
  const [currentPdfOrderId, setCurrentPdfOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [userRole, setUserRole] = useState("DESIGN");

  // ===========================
  // ✅ STANDARD PDF STATES
  // ===========================
  const [pdfRows, setPdfRows] = useState([]);
  const [partsRows, setPartsRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);

  const [selectedSubnestRowNos, setSelectedSubnestRowNos] = useState([]);
  const [designerPartsSelectedRowNos, setDesignerPartsSelectedRowNos] = useState([]);
  const [designerMaterialSelectedRowNos, setDesignerMaterialSelectedRowNos] = useState([]);

  // ===========================
  // ✅ NESTING PDF STATES
  // ===========================
  const [resultBlocks, setResultBlocks] = useState([]);
  const [plateInfoRows, setPlateInfoRows] = useState([]);
  const [partInfoRows, setPartInfoRows] = useState([]);
  const [activeResultNo, setActiveResultNo] = useState(null);

  const [designerSelectedRowIds, setDesignerSelectedRowIds] = useState([]);
  const [productionSelectedRowIds, setProductionSelectedRowIds] = useState([]);
  const [machineSelectedRowIds, setMachineSelectedRowIds] = useState([]);
  const [inspectionSelectedRowIds, setInspectionSelectedRowIds] = useState([]);

  // ===========================
  // ✅ HELPERS
  // ===========================
  const getToken = () => {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("swiftflow-user") : null;
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw);
      return auth?.token || null;
    } catch {
      return null;
    }
  };

  const numericOrderId = (orderId) => String(orderId || "").replace(/^SF/i, "");

  const badge = (s) => {
    const map = {
      Inquiry: "bg-blue-100 text-blue-700",
      Design: "bg-purple-100 text-purple-700",
      Machining: "bg-yellow-100 text-yellow-800",
      Inspection: "bg-indigo-100 text-indigo-700",
    };
    return map[s] || "bg-gray-100 text-gray-700";
  };

  const partsRowNoCounts = useMemo(() => {
    const counts = {};
    (partsRows || []).forEach((r) => {
      const k = r?.rowNo;
      if (k === undefined || k === null) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [partsRows]);

  const getPartsSelectionId = (row, idx) => {
    const rn = row?.rowNo;
    if (rn === undefined || rn === null) return String(idx);
    if ((partsRowNoCounts[rn] || 0) > 1) return `${rn}-${idx}`;
    return String(rn);
  };

  // ✅ Nesting ids
  const getNestingResultId = (block) => `RESULT-${block?.resultNo}`;
  const getNestingPlateId = (row) => `PLATE-${row?.order}-${row?.plateSize}`;
  const getNestingPartId = (row, idx) => `PART-${row?.order}-${row?.partName}-${idx}`;
  const getNestingResultPartId = (resultNo, partRow, idx) =>
    `RESULTPART-${resultNo}-${partRow?.partName ?? "PART"}-${idx}`;

  const ThumbnailBox = () => (
    <div className="w-[52px] h-[32px] border border-gray-300 rounded bg-white flex items-center justify-center text-[10px] text-gray-400">
      —
    </div>
  );

  const canEditRole = (role) => userRole === role;

  const isCheckedByRole = (role, id) => {
    if (role === "DESIGN") return designerSelectedRowIds.includes(id);
    if (role === "PRODUCTION") return productionSelectedRowIds.includes(id);
    if (role === "MACHINING") return machineSelectedRowIds.includes(id);
    if (role === "INSPECTION") return inspectionSelectedRowIds.includes(id);
    return false;
  };

  const toggleRoleRow = (role, id) => {
    if (!canEditRole(role)) return;

    const toggle = (prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];

    if (role === "DESIGN") setDesignerSelectedRowIds(toggle);
    if (role === "PRODUCTION") setProductionSelectedRowIds(toggle);
    if (role === "MACHINING") setMachineSelectedRowIds(toggle);
    if (role === "INSPECTION") setInspectionSelectedRowIds(toggle);
  };

  const activeResultBlock = useMemo(() => {
    if (!activeResultNo) return null;
    return (
      (resultBlocks || []).find(
        (b) => Number(b?.resultNo) === Number(activeResultNo)
      ) || null
    );
  }, [resultBlocks, activeResultNo]);

  // ===========================
  // ✅ SELECT ALL STANDARD
  // ===========================
  const isAllSubnestSelected = useMemo(() => {
    if (!pdfRows || pdfRows.length === 0) return false;
    return pdfRows.every((r) => selectedSubnestRowNos.includes(r.rowNo));
  }, [pdfRows, selectedSubnestRowNos]);

  const toggleSelectAllSubnest = () => {
    if (!pdfRows || pdfRows.length === 0) return;
    if (isAllSubnestSelected) setSelectedSubnestRowNos([]);
    else setSelectedSubnestRowNos(pdfRows.map((r) => r.rowNo));
  };

  const isAllPartsSelected = useMemo(() => {
    if (!partsRows || partsRows.length === 0) return false;
    const ids = partsRows.map((r, idx) => getPartsSelectionId(r, idx));
    return ids.every((id) => designerPartsSelectedRowNos.includes(id));
  }, [partsRows, designerPartsSelectedRowNos, partsRowNoCounts]);

  const toggleSelectAllParts = () => {
    if (!partsRows || partsRows.length === 0) return;
    const ids = partsRows.map((r, idx) => getPartsSelectionId(r, idx));
    if (isAllPartsSelected) setDesignerPartsSelectedRowNos([]);
    else setDesignerPartsSelectedRowNos(ids);
  };

  const isAllMaterialSelected = useMemo(() => {
    if (!materialRows || materialRows.length === 0) return false;
    return materialRows.every((_, idx) => designerMaterialSelectedRowNos.includes(idx));
  }, [materialRows, designerMaterialSelectedRowNos]);

  const toggleSelectAllMaterial = () => {
    if (!materialRows || materialRows.length === 0) return;
    if (isAllMaterialSelected) setDesignerMaterialSelectedRowNos([]);
    else setDesignerMaterialSelectedRowNos(materialRows.map((_, idx) => idx));
  };

  // ===========================
  // ✅ SELECT ALL NESTING
  // ===========================
  const nestingRowIdsForTab = useMemo(() => {
    if (activePdfTab === "results") return resultBlocks.map((b) => getNestingResultId(b));
    if (activePdfTab === "plate-info") return plateInfoRows.map((r) => getNestingPlateId(r));
    if (activePdfTab === "part-info") return partInfoRows.map((r, idx) => getNestingPartId(r, idx));
    return [];
  }, [activePdfTab, resultBlocks, plateInfoRows, partInfoRows]);

  const nestingPartsListRowIds = useMemo(() => {
    if (!activeResultNo) return [];
    return (activeResultBlock?.parts || []).map((p, idx) =>
      getNestingResultPartId(activeResultNo, p, idx)
    );
  }, [activeResultNo, activeResultBlock]);

  const mergeSelectAllIds = (tabIds, partsListIds) => {
    if (activePdfTab !== "results") return tabIds;
    return [...tabIds, ...partsListIds];
  };

  const isAllSelectedByRole = (role) => {
    const ids = mergeSelectAllIds(nestingRowIdsForTab, nestingPartsListRowIds);
    if (ids.length === 0) return false;

    if (role === "DESIGN") return ids.every((id) => designerSelectedRowIds.includes(id));
    if (role === "PRODUCTION") return ids.every((id) => productionSelectedRowIds.includes(id));
    if (role === "MACHINING") return ids.every((id) => machineSelectedRowIds.includes(id));
    if (role === "INSPECTION") return ids.every((id) => inspectionSelectedRowIds.includes(id));
    return false;
  };

  const toggleSelectAllByRole = (role) => {
    if (!canEditRole(role)) return;

    const ids = mergeSelectAllIds(nestingRowIdsForTab, nestingPartsListRowIds);
    if (ids.length === 0) return;

    const apply = (prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((x) => !ids.includes(x));
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    };

    if (role === "DESIGN") setDesignerSelectedRowIds(apply);
    if (role === "PRODUCTION") setProductionSelectedRowIds(apply);
    if (role === "MACHINING") setMachineSelectedRowIds(apply);
    if (role === "INSPECTION") setInspectionSelectedRowIds(apply);
  };

  // ===========================
  // ✅ LOAD ORDERS
  // ===========================
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const all = await orderApi.getAllOrders();
        const transformed = all.map((order) => {
          let formattedDate = "Unknown Date";
          if (order.dateAdded) {
            const [day, month, year] = order.dateAdded.split("-");
            const monthNames = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            const m = parseInt(month) - 1;
            if (m >= 0 && m < 12) formattedDate = `${parseInt(day)} ${monthNames[m]} ${year}`;
          }

          const customerName =
            order.customers && order.customers.length > 0
              ? order.customers[0].companyName ||
                order.customers[0].customerName ||
                "Unknown Customer"
              : "Unknown Customer";

          const productText =
            order.customProductDetails ||
            (order.products && order.products.length > 0
              ? `${order.products[0].productCode} - ${order.products[0].productName}`
              : "No Product");

          return {
            id: `SF${order.orderId}`,
            customer: customerName,
            products: productText,
            date: formattedDate,
            status: order.status || "Inquiry",
            department: order.department,
          };
        });

        setOrders(transformed);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };

    fetchOrders();
  }, []);

  // ===========================
  // ✅ FETCH PDF MAP
  // ===========================
  useEffect(() => {
    const fetchPdfInfo = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const entries = await Promise.all(
          orders.map(async (order) => {
            const numericId = String(order.id).replace(/^SF/i, "");
            if (!numericId) return [order.id, null];

            try {
              const response = await fetch(`http://localhost:8080/status/order/${numericId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!response.ok) return [order.id, null];
              const history = await response.json();

              const designPdf = Array.isArray(history)
                ? history
                    .filter(
                      (item) =>
                        item.attachmentUrl &&
                        item.attachmentUrl.toLowerCase().endsWith(".pdf") &&
                        (item.newStatus || "").toUpperCase() === "DESIGN"
                    )
                    .sort((a, b) => a.id - b.id)
                    .at(-1)
                : null;

              const fallbackPdf = Array.isArray(history)
                ? history.find(
                    (item) =>
                      item.attachmentUrl &&
                      item.attachmentUrl.toLowerCase().endsWith(".pdf")
                  )
                : null;

              const chosen = designPdf || fallbackPdf;
              return [order.id, chosen ? chosen.attachmentUrl : null];
            } catch {
              return [order.id, null];
            }
          })
        );

        const map = {};
        entries.forEach(([id, url]) => (map[id] = url));
        setPdfMap(map);
      } catch (e) {
        console.error(e);
      }
    };

    if (orders.length > 0) fetchPdfInfo();
    else setPdfMap({});
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery = `${o.id} ${o.customer}`.toLowerCase().includes(query.toLowerCase());
      const dept = (o.department || "").toUpperCase();
      return matchesQuery && dept === "DESIGN";
    });
  }, [orders, query]);

  // ===========================
  // ✅ SAVE STANDARD APIs
  // ===========================
  const savePartsSelection = async () => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(currentPdfOrderId);
    if (!numericId) return;

    try {
      const res = await fetch(`http://localhost:8080/pdf/order/${numericId}/parts-selection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ designerSelectedRowIds: designerPartsSelectedRowNos }),
      });

      if (res.ok) setToast({ message: "Parts selection saved", type: "success" });
      else setToast({ message: "Failed to save parts selection", type: "error" });
    } catch {
      setToast({ message: "Error saving parts selection", type: "error" });
    }
  };

  const saveMaterialSelection = async () => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(currentPdfOrderId);
    if (!numericId) return;

    try {
      const res = await fetch(`http://localhost:8080/pdf/order/${numericId}/material-selection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ designerSelectedRowIds: designerMaterialSelectedRowNos }),
      });

      if (res.ok) setToast({ message: "Material selection saved", type: "success" });
      else setToast({ message: "Failed to save material selection", type: "error" });
    } catch {
      setToast({ message: "Error saving material selection", type: "error" });
    }
  };

  // ===========================
  // ✅ LOAD + SAVE NESTING SELECTION
  // ===========================
  const loadThreeCheckboxSelection = async (orderId) => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(orderId);
    if (!numericId) return;

    try {
      const res = await fetch(
        `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;

      const data = await res.json();
      setDesignerSelectedRowIds(Array.isArray(data?.designerSelectedRowIds) ? data.designerSelectedRowIds : []);
      setProductionSelectedRowIds(Array.isArray(data?.productionSelectedRowIds) ? data.productionSelectedRowIds : []);
      setMachineSelectedRowIds(Array.isArray(data?.machineSelectedRowIds) ? data.machineSelectedRowIds : []);
      setInspectionSelectedRowIds(Array.isArray(data?.inspectionSelectedRowIds) ? data.inspectionSelectedRowIds : []);
    } catch (e) {
      console.error(e);
    }
  };

  const saveThreeCheckboxSelection = async () => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(currentPdfOrderId);
    if (!numericId) return;

    const payload = {
      designerSelectedRowIds: [],
      productionSelectedRowIds: [],
      machineSelectedRowIds: [],
      inspectionSelectedRowIds: [],
    };

    if (userRole === "DESIGN") payload.designerSelectedRowIds = designerSelectedRowIds;
    if (userRole === "PRODUCTION") payload.productionSelectedRowIds = productionSelectedRowIds;
    if (userRole === "MACHINING") payload.machineSelectedRowIds = machineSelectedRowIds;
    if (userRole === "INSPECTION") payload.inspectionSelectedRowIds = inspectionSelectedRowIds;

    try {
      const res = await fetch(
        `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) setToast({ message: "Selection saved successfully", type: "success" });
      else setToast({ message: "Failed to save selection", type: "error" });
    } catch {
      setToast({ message: "Error saving selection", type: "error" });
    }
  };

  // ===========================
  // ✅ NEW: COMMON SEND TO PRODUCTION (STANDARD + NESTING)
  // ===========================
  const sendToProductionCommon = async () => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(currentPdfOrderId);
    if (!numericId) return;

    try {
      setIsRowsLoading(true);

      // ✅ 1) Save selection
      if (pdfType === "standard") {
        if (selectedSubnestRowNos.length === 0) {
          setToast({ message: "Select at least 1 SubNest row", type: "error" });
          return;
        }

        const selectedItems = (pdfRows || [])
          .filter((r) => selectedSubnestRowNos.includes(r.rowNo))
          .map((r) => ({
            rowNo: r.rowNo,
            ncFile: r.ncFile,
            material: r.material,
            thickness: r.thickness,
            sizeX: r.sizeX,
            sizeY: r.sizeY,
            quantity: r.qty,
            area: r.areaM2,
            time: r.totalTime,
          }));

        const saveRes = await fetch(
          `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              designerSelectedRowIds: selectedSubnestRowNos.map(String),
              selectedItems,
            }),
          }
        );

        if (!saveRes.ok) {
          setToast({ message: "Failed to save selection", type: "error" });
          return;
        }
      } else {
        const anySelected =
          designerSelectedRowIds.length ||
          productionSelectedRowIds.length ||
          machineSelectedRowIds.length ||
          inspectionSelectedRowIds.length;

        if (!anySelected) {
          setToast({ message: "Select at least one row before sending!", type: "error" });
          return;
        }

        const payload = {
          designerSelectedRowIds: [],
          productionSelectedRowIds: [],
          machineSelectedRowIds: [],
          inspectionSelectedRowIds: [],
        };

        if (userRole === "DESIGN") payload.designerSelectedRowIds = designerSelectedRowIds;
        if (userRole === "PRODUCTION") payload.productionSelectedRowIds = productionSelectedRowIds;
        if (userRole === "MACHINING") payload.machineSelectedRowIds = machineSelectedRowIds;
        if (userRole === "INSPECTION") payload.inspectionSelectedRowIds = inspectionSelectedRowIds;

        const saveRes = await fetch(
          `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!saveRes.ok) {
          setToast({ message: "Failed to save nesting selection", type: "error" });
          return;
        }
      }

      // ✅ 2) Update status to PRODUCTION
      const statusPayload = {
        newStatus: "PRODUCTION",
        comment:
          pdfType === "nesting"
            ? "Nesting selection sent to Production"
            : "Design selection saved and sent to Production",
        percentage: null,
        attachmentUrl: pdfModalUrl,
      };

      const formData = new FormData();
      formData.append(
        "status",
        new Blob([JSON.stringify(statusPayload)], { type: "application/json" })
      );

      const statusRes = await fetch(`http://localhost:8080/status/create/${numericId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!statusRes.ok) {
        setToast({ message: "Failed to update order status to PRODUCTION", type: "error" });
        return;
      }

      setToast({ message: "Saved & Sent to Production ✅", type: "success" });
      setPdfModalUrl(null);
      resetPdfStates();
    } catch (e) {
      console.error(e);
      setToast({ message: "Error sending to Production", type: "error" });
    } finally {
      setIsRowsLoading(false);
    }
  };

  // ===========================
  // ✅ RESET MODAL STATES
  // ===========================
  const resetPdfStates = () => {
    setPdfRows([]);
    setPartsRows([]);
    setMaterialRows([]);
    setSelectedSubnestRowNos([]);
    setDesignerPartsSelectedRowNos([]);
    setDesignerMaterialSelectedRowNos([]);

    setResultBlocks([]);
    setPlateInfoRows([]);
    setPartInfoRows([]);
    setActiveResultNo(null);

    setDesignerSelectedRowIds([]);
    setProductionSelectedRowIds([]);
    setMachineSelectedRowIds([]);
    setInspectionSelectedRowIds([]);
  };

  // ===========================
  // ✅ MAIN FUNCTION: DETECT PDF TYPE AND LOAD CORRECT DATA (UNCHANGED EXTRACTION)
  // ===========================
  const openPdfModalForAttachment = async (attachmentUrl, orderId) => {
    setPdfModalUrl(attachmentUrl);
    setCurrentPdfOrderId(orderId || null);

    resetPdfStates();

    setIsRowsLoading(true);
    setIsAnalyzingPdf(true);

    const token = getToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // ✅ TRY NESTING FIRST
      const plateApi = `http://localhost:8080/api/nesting/plate-info?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;
      const partApi = `http://localhost:8080/api/nesting/part-info?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;
      const resultApi = `http://localhost:8080/api/nesting/results?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;

      const [plateRes, partRes, resultRes] = await Promise.all([
        fetch(plateApi, { headers }),
        fetch(partApi, { headers }),
        fetch(resultApi, { headers }),
      ]);

      const plateData = plateRes.ok ? await plateRes.json() : [];
      const partData = partRes.ok ? await partRes.json() : [];
      const resultData = resultRes.ok ? await resultRes.json() : [];

      const hasNesting = Array.isArray(resultData) && resultData.length > 0;

      if (hasNesting) {
        setPdfType("nesting");
        setActivePdfTab("results");

        setPlateInfoRows(Array.isArray(plateData) ? plateData : []);
        setPartInfoRows(Array.isArray(partData) ? partData : []);
        setResultBlocks(Array.isArray(resultData) ? resultData : []);

        const sorted = [...resultData].sort((a, b) => (a?.resultNo || 0) - (b?.resultNo || 0));
        setActiveResultNo(sorted?.[0]?.resultNo ?? null);

        await loadThreeCheckboxSelection(orderId);

        setIsAnalyzingPdf(false);
        setIsRowsLoading(false);
        return;
      }

      // ✅ ELSE STANDARD
      const baseSubnest = `http://localhost:8080/api/pdf/subnest/by-url?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;
      const baseParts = `http://localhost:8080/api/pdf/subnest/parts/by-url?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;
      const baseMaterial = `http://localhost:8080/api/pdf/subnest/material-data/by-url?attachmentUrl=${encodeURIComponent(
        attachmentUrl
      )}`;

      const [subnestRes, partsRes, materialRes] = await Promise.all([
        fetch(baseSubnest, { headers }),
        fetch(baseParts, { headers }),
        fetch(baseMaterial, { headers }),
      ]);

      const subnestData = subnestRes.ok ? await subnestRes.json() : [];
      const partsData = partsRes.ok ? await partsRes.json() : [];
      const materialData = materialRes.ok ? await materialRes.json() : [];

      setPdfType("standard");
      setActivePdfTab("subnest");

      setPdfRows(Array.isArray(subnestData) ? subnestData : []);
      setPartsRows(Array.isArray(partsData) ? partsData : []);
      setMaterialRows(Array.isArray(materialData) ? materialData : []);
    } catch (e) {
      console.error("PDF detect error:", e);
      setToast({ message: "Failed to load PDF", type: "error" });
    } finally {
      setIsAnalyzingPdf(false);
      setIsRowsLoading(false);
    }
  };

  // ===========================
  // ✅ UPLOAD
  // ===========================
  const handleUploadClick = (orderId) => {
    setCurrentPdfOrderId(orderId || null);
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const token = getToken();
    if (!token) return;

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("http://localhost:8080/status/upload-pdf", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadResponse.ok) return;

    const uploadData = await uploadResponse.json();
    const uploadedUrl = uploadData?.attachmentUrl || uploadData?.url;
    if (!uploadedUrl) return;

    await openPdfModalForAttachment(uploadedUrl, currentPdfOrderId);
  };

  // ===========================
  // ✅ UI
  // ===========================
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Design Department</h1>
            <p className="text-sm text-gray-600 mt-1">Manage orders in the inquiry and design phase.</p>
          </div>

          {toast.message && (
            <div
              className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-md text-sm shadow-lg border flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast({ message: "", type: "" })}
                className="ml-2 text-xs font-semibold hover:underline"
              >
                Close
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Order ID or Customer..."
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-3 px-4 font-medium">Order ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Product(s)</th>
                <th className="py-3 px-4 font-medium">Date Created</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">PDF</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="py-4 px-4">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {o.id}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-gray-900 font-medium">{o.customer}</td>
                  <td className="py-4 px-4 text-gray-600">{o.products}</td>
                  <td className="py-4 px-4 text-gray-700">{o.date}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge(
                        o.status
                      )}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs">
                      {pdfMap[o.id] && (
                        <button
                          type="button"
                          onClick={async () => {
                            setCurrentPdfOrderId(o.id);
                            await openPdfModalForAttachment(pdfMap[o.id], o.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUploadClick(o.id)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Upload
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ MODAL */}
        {pdfModalUrl && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setPdfModalUrl(null);
                resetPdfStates();
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-6xl h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">PDF Preview & Row Selection</h3>

                  <button
                    type="button"
                    onClick={() => {
                      setPdfModalUrl(null);
                      resetPdfStates();
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex">
                  {/* LEFT PDF */}
                  <div className="w-1/2 border-r border-gray-200">
                    <PdfRowOverlayViewer
                      pdfUrl={pdfModalUrl}
                      rows={[]}
                      selectedRowIds={[]}
                      onToggleRow={() => {}}
                      showCheckboxes={false}
                    />
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="w-1/2 flex flex-col">
                    {/* TABS */}
                    <div className="border-b border-gray-200 flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex gap-2">
                        {pdfType === "standard" ? (
                          <>
                            <button
                              type="button"
                              className={
                                activePdfTab === "subnest"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("subnest")}
                            >
                              SubNest
                            </button>
                            <button
                              type="button"
                              className={
                                activePdfTab === "parts"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("parts")}
                            >
                              Parts
                            </button>
                            <button
                              type="button"
                              className={
                                activePdfTab === "material"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("material")}
                            >
                              Material Data
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={
                                activePdfTab === "results"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("results")}
                            >
                              Results
                            </button>
                            <button
                              type="button"
                              className={
                                activePdfTab === "plate-info"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("plate-info")}
                            >
                              Plate Info
                            </button>
                            <button
                              type="button"
                              className={
                                activePdfTab === "part-info"
                                  ? "font-semibold text-indigo-600"
                                  : "text-gray-600"
                              }
                              onClick={() => setActivePdfTab("part-info")}
                            >
                              Part Info
                            </button>
                          </>
                        )}
                      </div>

                      <span className="text-xs text-gray-500">
                        {pdfType === "nesting" ? "Nesting PDF" : "Standard PDF"} | Role:{" "}
                        <b>{userRole}</b>
                      </span>
                    </div>

                    {/* LOADING */}
                    {(isAnalyzingPdf || isRowsLoading) && (
                      <div className="flex flex-col items-center justify-center flex-1">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                        <p className="text-sm text-gray-600">
                          {isAnalyzingPdf ? "Detecting PDF type..." : "Loading PDF data..."}
                        </p>
                      </div>
                    )}

                    {/* TABLE */}
                    {!isAnalyzingPdf && !isRowsLoading && (
                      <div className="flex-1 overflow-auto p-2 text-xs">
                        {/* ✅ STANDARD UI */}
                        {pdfType === "standard" && (
                          <>
                            {activePdfTab === "subnest" && (
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">No.</th>
                                    <th className="px-2 py-1">Size X</th>
                                    <th className="px-2 py-1">Size Y</th>
                                    <th className="px-2 py-1">Material</th>
                                    <th className="px-2 py-1">Thk</th>
                                    <th className="px-2 py-1">Time / inst.</th>
                                    <th className="px-2 py-1">Total time</th>
                                    <th className="px-2 py-1">NC file</th>
                                    <th className="px-2 py-1">Qty</th>
                                    <th className="px-2 py-1">Area</th>
                                    <th className="px-2 py-1">Eff%</th>
                                    <th className="px-2 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isAllSubnestSelected}
                                        onChange={toggleSelectAllSubnest}
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                  {pdfRows.map((row) => (
                                    <tr key={row.rowNo}>
                                      <td className="px-2 py-1 font-medium">{row.rowNo}</td>
                                      <td className="px-2 py-1">{row.sizeX}</td>
                                      <td className="px-2 py-1">{row.sizeY}</td>
                                      <td className="px-2 py-1">{row.material}</td>
                                      <td className="px-2 py-1">{row.thickness}</td>
                                      <td className="px-2 py-1">{row.timePerInstance}</td>
                                      <td className="px-2 py-1">{row.totalTime}</td>
                                      <td className="px-2 py-1">{row.ncFile}</td>
                                      <td className="px-2 py-1 text-right">{row.qty}</td>
                                      <td className="px-2 py-1 text-right">{row.areaM2}</td>
                                      <td className="px-2 py-1 text-right">{row.efficiencyPercent}</td>
                                      <td className="px-2 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={selectedSubnestRowNos.includes(row.rowNo)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setSelectedSubnestRowNos((prev) =>
                                              checked
                                                ? [...prev, row.rowNo]
                                                : prev.filter((x) => x !== row.rowNo)
                                            );
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {activePdfTab === "parts" && (
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">No.</th>
                                    <th className="px-2 py-1">Part name</th>
                                    <th className="px-2 py-1">Material</th>
                                    <th className="px-2 py-1">Thk</th>
                                    <th className="px-2 py-1">Req qty</th>
                                    <th className="px-2 py-1">Placed qty</th>
                                    <th className="px-2 py-1">Weight</th>
                                    <th className="px-2 py-1">Time/inst</th>
                                    <th className="px-2 py-1">Pierce</th>
                                    <th className="px-2 py-1">Cut Len</th>
                                    <th className="px-2 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isAllPartsSelected}
                                        onChange={toggleSelectAllParts}
                                      />
                                    </th>
                                  </tr>
                                </thead>

                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                  {partsRows.map((row, idx) => {
                                    const id = getPartsSelectionId(row, idx);
                                    return (
                                      <tr key={id}>
                                        <td className="px-2 py-1 font-medium">{idx + 1}</td>
                                        <td className="px-2 py-1">{row.partName}</td>
                                        <td className="px-2 py-1">{row.material}</td>
                                        <td className="px-2 py-1">{row.thickness}</td>
                                        <td className="px-2 py-1 text-right">{row.requiredQty}</td>
                                        <td className="px-2 py-1 text-right">{row.placedQty}</td>
                                        <td className="px-2 py-1 text-right">{row.weightKg}</td>
                                        <td className="px-2 py-1">{row.timePerInstance}</td>
                                        <td className="px-2 py-1 text-right">{row.pierceQty}</td>
                                        <td className="px-2 py-1 text-right">{row.cuttingLength}</td>
                                        <td className="px-2 py-1 text-center">
                                          <input
                                            type="checkbox"
                                            checked={designerPartsSelectedRowNos.includes(id)}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setDesignerPartsSelectedRowNos((prev) =>
                                                checked
                                                  ? [...prev, id]
                                                  : prev.filter((x) => x !== id)
                                              );
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}

                            {activePdfTab === "material" && (
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">Material</th>
                                    <th className="px-2 py-1">Thk</th>
                                    <th className="px-2 py-1">Size X</th>
                                    <th className="px-2 py-1">Size Y</th>
                                    <th className="px-2 py-1 text-right">Qty</th>
                                    <th className="px-2 py-1">Notes</th>
                                    <th className="px-2 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isAllMaterialSelected}
                                        onChange={toggleSelectAllMaterial}
                                      />
                                    </th>
                                  </tr>
                                </thead>

                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                  {materialRows.map((row, idx) => (
                                    <tr key={idx}>
                                      <td className="px-2 py-1">{row.material}</td>
                                      <td className="px-2 py-1">{row.thickness}</td>
                                      <td className="px-2 py-1">{row.sizeX}</td>
                                      <td className="px-2 py-1">{row.sizeY}</td>
                                      <td className="px-2 py-1 text-right">{row.sheetQty}</td>
                                      <td className="px-2 py-1">{row.notes}</td>
                                      <td className="px-2 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={designerMaterialSelectedRowNos.includes(idx)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setDesignerMaterialSelectedRowNos((prev) =>
                                              checked ? [...prev, idx] : prev.filter((x) => x !== idx)
                                            );
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </>
                        )}

                        {/* ✅ NESTING UI */}
                        {pdfType === "nesting" && (
                          <>
                            {/* RESULTS */}
                            {activePdfTab === "results" && (
                              <>
                                <div className="mb-2">
                                  <div className="text-[11px] font-semibold text-gray-700 mb-1">
                                    Select Result (1..15)
                                  </div>

                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map((no) => {
                                      const exists = resultBlocks.some((b) => Number(b?.resultNo) === no);

                                      return (
                                        <button
                                          key={no}
                                          type="button"
                                          disabled={!exists}
                                          onClick={() => exists && setActiveResultNo(no)}
                                          className={`shrink-0 px-3 py-1 rounded-full border text-[11px] font-semibold transition ${
                                            !exists
                                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                              : activeResultNo === no
                                              ? "bg-indigo-600 text-white border-indigo-600"
                                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                          }`}
                                        >
                                          Result {no}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <table className="min-w-full text-xs border border-gray-200">
                                  <thead>
                                    <tr className="text-left text-gray-700 border-b border-gray-200">
                                      <th className="px-2 py-1">Result</th>
                                      <th className="px-2 py-1">Thumbnail</th>
                                      <th className="px-2 py-1">Material</th>
                                      <th className="px-2 py-1">Thickness</th>
                                      <th className="px-2 py-1">Plate Size</th>
                                      <th className="px-2 py-1">Proc Time</th>

                                      {[
                                        { label: "D", role: "DESIGN" },
                                        { label: "P", role: "PRODUCTION" },
                                        { label: "M", role: "MACHINING" },
                                        { label: "I", role: "INSPECTION" },
                                      ].map((x) => (
                                        <th key={x.role} className="px-2 py-1 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                            <span>{x.label}</span>
                                            <input
                                              type="checkbox"
                                              checked={isAllSelectedByRole(x.role)}
                                              disabled={!canEditRole(x.role)}
                                              onChange={() => toggleSelectAllByRole(x.role)}
                                            />
                                          </div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>

                                  <tbody className="text-gray-900 divide-y divide-gray-100">
                                    {resultBlocks
                                      .slice()
                                      .sort((a, b) => (a?.resultNo || 0) - (b?.resultNo || 0))
                                      .map((block) => {
                                        const id = getNestingResultId(block);
                                        const active = Number(block?.resultNo) === Number(activeResultNo);

                                        return (
                                          <tr
                                            key={id}
                                            className={active ? "bg-indigo-50" : ""}
                                            onClick={() => setActiveResultNo(block?.resultNo)}
                                          >
                                            <td className="px-2 py-1 font-semibold">{block.resultNo}</td>
                                            <td className="px-2 py-1">
                                              <ThumbnailBox />
                                            </td>
                                            <td className="px-2 py-1">{block.material}</td>
                                            <td className="px-2 py-1">{block.thickness}</td>
                                            <td className="px-2 py-1">{block.plateSize}</td>
                                            <td className="px-2 py-1">{block.planProcessTime}</td>

                                            {["DESIGN", "PRODUCTION", "MACHINING", "INSPECTION"].map((role) => (
                                              <td
                                                key={role}
                                                className="px-2 py-1 text-center"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isCheckedByRole(role, id)}
                                                  disabled={!canEditRole(role)}
                                                  onChange={() => toggleRoleRow(role, id)}
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>

                                <div className="mt-3 border border-gray-200 rounded">
                                  <div className="px-2 py-1 text-[11px] font-semibold text-gray-700 border-b border-gray-200 flex items-center justify-between">
                                    <span>
                                      Parts List {activeResultNo ? `(Result ${activeResultNo})` : ""}
                                    </span>
                                    <span className="text-gray-500 font-normal">
                                      {(activeResultBlock?.parts || []).length} Parts Total
                                    </span>
                                  </div>

                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-gray-700 border-b border-gray-200">
                                        <th className="px-2 py-1">Thumbnail</th>
                                        <th className="px-2 py-1">Part Name</th>
                                        <th className="px-2 py-1">Size</th>
                                        <th className="px-2 py-1 text-center">Count</th>

                                        {[
                                          { label: "D", role: "DESIGN" },
                                          { label: "P", role: "PRODUCTION" },
                                          { label: "M", role: "MACHINING" },
                                          { label: "I", role: "INSPECTION" },
                                        ].map((x) => (
                                          <th key={x.role} className="px-2 py-1 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                              <span>{x.label}</span>
                                              <input
                                                type="checkbox"
                                                checked={isAllSelectedByRole(x.role)}
                                                disabled={!canEditRole(x.role)}
                                                onChange={() => toggleSelectAllByRole(x.role)}
                                              />
                                            </div>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 text-gray-900">
                                      {(activeResultBlock?.parts || []).map((p, idx) => {
                                        const rowId = getNestingResultPartId(activeResultNo, p, idx);

                                        return (
                                          <tr key={rowId}>
                                            <td className="px-2 py-1">
                                              <ThumbnailBox />
                                            </td>
                                            <td className="px-2 py-1 font-medium">{p.partName}</td>
                                            <td className="px-2 py-1 whitespace-nowrap">{p.size}</td>
                                            <td className="px-2 py-1 text-center">{p.count}</td>

                                            {["DESIGN", "PRODUCTION", "MACHINING", "INSPECTION"].map((role) => (
                                              <td
                                                key={role}
                                                className="px-2 py-1 text-center"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isCheckedByRole(role, rowId)}
                                                  disabled={!canEditRole(role)}
                                                  onChange={() => toggleRoleRow(role, rowId)}
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                        );
                                      })}

                                      {(activeResultBlock?.parts || []).length === 0 && (
                                        <tr>
                                          <td className="px-2 py-3 text-center text-gray-400" colSpan={8}>
                                            No Parts List found in this Result.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}

                            {/* PLATE */}
                            {activePdfTab === "plate-info" && (
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">Order</th>
                                    {/* <th className="px-2 py-1">Part Name</th> */}
                                    <th className="px-2 py-1">Thumbnail</th>
                                    <th className="px-2 py-1">Size (mm × mm)</th>
                                    <th className="px-2 py-1">Parts Count</th>
                                    <th className="px-2 py-1">Cut Total Length</th>
                                    <th className="px-2 py-1">Move Total Length</th>
                                    <th className="px-2 py-1">Plan Process Time</th>
                                    <th className="px-2 py-1">Count</th>

                                    {[
                                      { label: "D", role: "DESIGN" },
                                      { label: "P", role: "PRODUCTION" },
                                      { label: "M", role: "MACHINING" },
                                      { label: "I", role: "INSPECTION" },
                                    ].map((x) => (
                                      <th key={x.role} className="px-2 py-1 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <span>{x.label}</span>
                                          <input
                                            type="checkbox"
                                            checked={isAllSelectedByRole(x.role)}
                                            disabled={!canEditRole(x.role)}
                                            onChange={() => toggleSelectAllByRole(x.role)}
                                          />
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                  {plateInfoRows.map((row, idx) => {
                                    const id = getNestingPlateId(row);
                                    return (
                                      <tr key={id + idx}>
                                        <td className="px-2 py-1 font-medium">{row.order}</td>
                                        {/* <td className="px-2 py-1">{row.partName}</td> */}
                                        <td className="px-2 py-1">
                                          <ThumbnailBox />
                                        </td>
                                        <td className="px-2 py-1">{row.plateSize || row.size}</td>
                                        <td className="px-2 py-1 text-center">{row.partsCount}</td>
                                        <td className="px-2 py-1 text-center">{row.cutTotalLength}</td>
                                        <td className="px-2 py-1 text-center">{row.moveTotalLength}</td>
                                        <td className="px-2 py-1 text-center">{row.planProcessTime}</td>
                                        <td className="px-2 py-1 text-center">{row.count}</td>

                                        {["DESIGN", "PRODUCTION", "MACHINING", "INSPECTION"].map((role) => (
                                          <td key={role} className="px-2 py-1 text-center">
                                            <input
                                              type="checkbox"
                                              checked={isCheckedByRole(role, id)}
                                              disabled={!canEditRole(role)}
                                              onChange={() => toggleRoleRow(role, id)}
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}

                            {/* PART */}
                            {activePdfTab === "part-info" && (
                              <table className="min-w-full text-xs border border-gray-200">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">Order</th>
                                    <th className="px-2 py-1">Part Name</th>
                                    <th className="px-2 py-1">Thumbnail</th>
                                    <th className="px-2 py-1">Size (mm × mm)</th>
                                    <th className="px-2 py-1">Parts Count</th>
                                    <th className="px-2 py-1">Nest Count</th>
                                    <th className="px-2 py-1">Remain Count</th>
                                    <th className="px-2 py-1">Processed</th>

                                    {[
                                      { label: "D", role: "DESIGN" },
                                      { label: "P", role: "PRODUCTION" },
                                      { label: "M", role: "MACHINING" },
                                      { label: "I", role: "INSPECTION" },
                                    ].map((x) => (
                                      <th key={x.role} className="px-2 py-1 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <span>{x.label}</span>
                                          <input
                                            type="checkbox"
                                            checked={isAllSelectedByRole(x.role)}
                                            disabled={!canEditRole(x.role)}
                                            onChange={() => toggleSelectAllByRole(x.role)}
                                          />
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                  {partInfoRows.map((row, idx) => {
                                    const id = getNestingPartId(row, idx);
                                    return (
                                      <tr key={id}>
                                        <td className="px-2 py-1 font-medium">{row.order}</td>
                                        <td className="px-2 py-1">{row.partName}</td>
                                        <td className="px-2 py-1">
                                          <ThumbnailBox />
                                        </td>
                                        <td className="px-2 py-1">{row.size}</td>
                                        <td className="px-2 py-1 text-center">{row.partsCount}</td>
                                        <td className="px-2 py-1 text-center">{row.nestCount}</td>
                                        <td className="px-2 py-1 text-center">{row.remainCount}</td>
                                        <td className="px-2 py-1 text-center">{row.processed}</td>

                                        {["DESIGN", "PRODUCTION", "MACHINING", "INSPECTION"].map((role) => (
                                          <td key={role} className="px-2 py-1 text-center">
                                            <input
                                              type="checkbox"
                                              checked={isCheckedByRole(role, id)}
                                              disabled={!canEditRole(role)}
                                              onChange={() => toggleRoleRow(role, id)}
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* FOOTER BUTTONS */}
                    {!isAnalyzingPdf && !isRowsLoading && (
                      <div className="p-3 border-t border-gray-200 flex gap-2">
                        {pdfType === "standard" ? (
                          <>
                            {activePdfTab === "parts" && (
                              <button
                                type="button"
                                disabled={designerPartsSelectedRowNos.length === 0}
                                onClick={savePartsSelection}
                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 text-white text-xs py-2"
                              >
                                Save Parts Selection
                              </button>
                            )}

                            {activePdfTab === "material" && (
                              <button
                                type="button"
                                disabled={designerMaterialSelectedRowNos.length === 0}
                                onClick={saveMaterialSelection}
                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 text-white text-xs py-2"
                              >
                                Save Material Selection
                              </button>
                            )}

                            {activePdfTab === "subnest" && (
                              <button
                                type="button"
                                disabled={selectedSubnestRowNos.length === 0}
                                onClick={sendToProductionCommon}
                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 text-white text-xs py-2"
                              >
                                Save & Send to Production
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={saveThreeCheckboxSelection}
                              className="flex-1 rounded-md bg-indigo-600 text-white text-xs py-2"
                            >
                              Save Selection (Role)
                            </button>

                            <button
                              type="button"
                              onClick={sendToProductionCommon}
                              className="flex-1 rounded-md bg-green-600 text-white text-xs py-2"
                            >
                              Send to Production
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <DetailsPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
}
