"use client";

import { useState, useEffect } from "react";
import { userService } from "./userService";
import toast from "react-hot-toast";

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium";
  if (status === "Active") {
    return (
      <span className={`${base} bg-indigo-600 text-white`}>{status}</span>
    );
  }
  return (
    <span className={`${base} bg-gray-100 text-gray-700`}>{status}</span>
  );
}

function RoleBadge({ role }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-xs font-medium text-gray-700">
      {role}
    </span>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "",
    phoneNumber: "",
    machineId: "", // Add machineId to form state
  });

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchMachines();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      toast.error("Failed to fetch users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const machinesData = await userService.getAllMachines();
      setMachines(machinesData);
    } catch (error) {
      toast.error("Failed to fetch machines: " + error.message);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingUser(null);
    setForm({ fullName: "", email: "", role: "", phoneNumber: "", machineId: "" });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const userData = {
        username: form.email,
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        phoneNumber: form.phoneNumber || undefined,
      };
      
      const newUser = await userService.createUser(userData);
      
      // If role is MACHINING and machine is selected, assign machine
      if (newUser && form.role === 'MACHINING' && form.machineId) {
        try {
          await userService.assignMachineToUser(newUser.id, parseInt(form.machineId));
          toast.success("User created and machine assigned successfully!");
        } catch (machineError) {
          toast.error("User created but failed to assign machine: " + machineError.message);
        }
      } else {
        toast.success("User created successfully!");
      }
      
      fetchUsers();
      closeModal();
    } catch (error) {
      toast.error("Failed to create user: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        username: form.email,
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        phoneNumber: form.phoneNumber,
      };
      
      await userService.updateUser(editingUser.id, userData);
      toast.success("User updated successfully!");
      fetchUsers();
      closeModal();
    } catch (error) {
      toast.error("Failed to update user: " + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }
    
    try {
      await userService.deleteUser(userId);
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const handleSendLoginDetails = async (userId) => {
    try {
      await userService.sendLoginDetails(userId);
      toast.success("Login details sent successfully!");
    } catch (error) {
      toast.error("Failed to send login details: " + error.message);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      role: user.department || "",
      phoneNumber: user.phoneNumber || "",
    });
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Create, view, and manage user accounts.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 self-start sm:self-auto"
          >
            <span className="text-base">👤</span>
            <span>Create User</span>
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Desktop list header */}
          <div className="hidden md:grid grid-cols-12 gap-4 pl-6 pr-10 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Phone Number</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Desktop list rows */}
          <div className="hidden md:block">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading users...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No users found</div>
              </div>
            ) : (
              users.map((user, idx) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-12 gap-4 items-center pl-6 pr-10 py-4 text-sm ${
                    idx !== users.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  {/* User */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {user.fullName
                        ? user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : user.email
                            ? user.email
                                .split("@")
                                .map((n) => n[0])
                                .join("")
                            : "U"
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.fullName || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <RoleBadge role={user.department} />
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <StatusBadge status={user.enabled ? "Active" : "Inactive"} />
                  </div>

                  {/* Date Added */}
                  <div className="col-span-3 text-sm text-gray-700">
                    {user.phoneNumber || "No phone"}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-2">
                    <button
                      onClick={() => handleSendLoginDetails(user.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      title="Send Login Details"
                    >
                      <span>📧</span>
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-100"
                      title="Edit User"
                    >
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      title="Delete User"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading users...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No users found</div>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {user.fullName
                        ? user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : user.email
                            ? user.email
                                .split("@")
                                .map((n) => n[0])
                                .join("")
                            : "U"
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {user.fullName || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <RoleBadge role={user.department} />
                    <StatusBadge status={user.enabled ? "Active" : "Inactive"} />
                    <span className="text-gray-500 text-[11px]">
                      {user.phoneNumber || "No phone"}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleSendLoginDetails(user.id)}
                      className="px-2 py-1 rounded-full border border-blue-200 text-xs text-blue-600 hover:bg-blue-50"
                      title="Send Login Details"
                    >
                      📧
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="px-2 py-1 rounded-full border border-green-200 text-xs text-green-600 hover:bg-green-50"
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-2 py-1 rounded-full border border-red-200 text-xs text-red-600 hover:bg-red-50"
                      title="Delete User"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Create New User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-8 bg-black/40">
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Create New User
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Enter the details for the new user account.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-5 py-4 sm:py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john.d@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional - will be used as password if not provided)
                </label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  required
                >
                  <option value="" disabled>
                    Select a role...
                  </option>
                  <option value="ADMIN">Admin</option>
                  <option value="DESIGN">Design</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="MACHINING">Machinists</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
              </div>

              {/* Machine selection for MACHINING role */}
              {form.role === 'MACHINING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Machine
                  </label>
                  <select
                    value={form.machineId}
                    onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">Select a machine...</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.machineName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    isCreating
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-8 bg-black/40">
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Edit User
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Update the user details.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditUser} className="px-5 py-4 sm:py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john.d@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  required
                >
                  <option value="" disabled>
                    Select a role...
                  </option>
                  <option value="ADMIN">Admin</option>
                  <option value="DESIGN">Design</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="MACHINING">Machinists</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

