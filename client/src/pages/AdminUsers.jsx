import { useEffect, useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const { authUser } = useContext(AuthContext);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const { data } = await axios.get("/api/users/users");
      if (data.success) setUsers(data.users);
    } catch {
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    if (authUser?.isAdmin) fetchUsers();
  }, [authUser]);

  // DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      const { data } = await axios.delete(`/api/users/delete/${id}`);
      if (data.success) {
        toast.success(data.message);
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  if (!authUser?.isAdmin) return null;

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-semibold mb-4">Admin - User Management</h2>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex justify-between items-center bg-[#1e293b] p-3 rounded"
          >
            <div>
              <p className="font-medium">{user.fullName}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>

            <button
              onClick={() => deleteUser(user._id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
