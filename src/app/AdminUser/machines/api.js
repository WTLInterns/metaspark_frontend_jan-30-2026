import api from '@/utils/api';

// Add a new machine
export const addMachine = async (machineData) => {
  return await api.post('/machine/add-machine', {
    machineName: machineData.name,
    status: machineData.status,
    dateAdded: machineData.dateAdded
  });
};

// Get all machines
export const getAllMachines = async () => {
  return await api.get('/machine/getAllMachines');
};

// Update a machine
export const updateMachine = async (id, machineData) => {
  return await api.put(`/machine/update-machine/${id}`, {
    machineName: machineData.name,
    status: machineData.status,
    dateAdded: machineData.dateAdded,
  });
};

// Delete a machine
export const deleteMachine = async (id) => {
  return await api.delete(`/machine/delete-machine/${id}`);
};