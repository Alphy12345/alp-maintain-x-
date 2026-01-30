import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import WorkOrders from './pages/WorkOrders';
import Assets from './pages/Assets';
import Reporting from './pages/Reporting.jsx';
import Categories from './pages/Categories.jsx';
import PartsInventory from './pages/PartsInventory.jsx';
import Procedures from './pages/Procedures.jsx';
import TeamsUsers from './pages/TeamsUsers.jsx';
import InviteUsers from './pages/InviteUsers.jsx';
import Vendors from './pages/Vendors.jsx';
import VendorCreate from './pages/VendorCreate.jsx';
import OutputData from './pages/OutputData.jsx';
import Locations from './pages/Locations.jsx';
import LocationCreate from './pages/LocationCreate.jsx';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/work-orders" replace />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/reports" element={<Reporting />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/parts" element={<PartsInventory />} />
          <Route path="/library/procedures" element={<Procedures />} />
          <Route path="/teams-users" element={<TeamsUsers />} />
          <Route path="/teams-users/invite" element={<InviteUsers />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/create" element={<VendorCreate />} />
          <Route path="/vendors/:id/edit" element={<VendorCreate />} />
          <Route path="/output-data" element={<OutputData />} />

          <Route path="/requests" element={<Navigate to="/work-orders" replace />} />
          <Route path="/messages" element={<Navigate to="/work-orders" replace />} />
          <Route path="/meters" element={<Navigate to="/work-orders" replace />} />
          <Route path="/automations" element={<Navigate to="/work-orders" replace />} />
          <Route path="/automations/create" element={<Navigate to="/work-orders" replace />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/locations/create" element={<LocationCreate />} />
          <Route path="/locations/:id/edit" element={<LocationCreate />} />
          <Route path="/settings" element={<Navigate to="/work-orders" replace />} />
          <Route path="/library/asset-packages" element={<Navigate to="/work-orders" replace />} />
          <Route path="/library/work-orders" element={<Navigate to="/work-orders" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
