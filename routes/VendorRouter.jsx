import React from "react";
import { Routes, Route } from "react-router-dom";
import VendorDashboard from "../pages/VendorDashboard";
import VendorEarnings from "../pages/VendorEarnings";
import WithdrawalPage from "../pages/WithdrawalPage"; // Add this import
// ... other imports

const VendorRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<VendorDashboard />} />
      <Route path="/earnings" element={<VendorEarnings />} />
      <Route path="/withdraw" element={<WithdrawalPage />} />{" "}
      {/* Add this route */}
      {/* ... other routes */}
    </Routes>
  );
};

export default VendorRouter;
