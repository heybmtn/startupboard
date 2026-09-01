import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Claim from "./pages/Claim";
import Success from "./pages/Success";
import Cancelled from "./pages/Cancelled";
import TerritoryPage from "./pages/TerritoryPage";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/claim/:slug" element={<Claim />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancelled" element={<Cancelled />} />
      <Route path="/territory/:slug" element={<TerritoryPage />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
