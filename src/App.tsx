/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Asset, Transaction } from "./types";
import Dashboard from "./components/Dashboard";
import AssetTable from "./components/AssetTable";
import TransactionForm from "./components/TransactionForm";
import BackloadChecksheets from "./components/BackloadChecksheets";
import Settings from "./components/Settings";
import { 
  Building2, 
  MapPin, 
  Layers, 
  CheckCircle, 
  FileSpreadsheet, 
  RotateCcw,
  Sliders,
  Database,
  Activity,
  User,
  ShieldCheck,
  ClipboardCheck,
  Settings as SettingsIcon
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "database" | "transactions" | "checksheets" | "settings">("dashboard");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedOwner, setSelectedOwner] = useState("CMT"); // Default CMT selection as requested
  const [vessels, setVessels] = useState<string[]>([]);
  const [rigs, setRigs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState("");

  // Load backend details
  const fetchState = async () => {
    try {
      setLoading(true);
      const assetsRes = await fetch("/api/assets");
      const txsRes = await fetch("/api/transactions");
      
      if (!assetsRes.ok || !txsRes.ok) {
        throw new Error("Failed to pull CCU server database states.");
      }

      const assetsData = await assetsRes.json();
      const txsData = await txsRes.json();

      setAssets(assetsData);
      setTransactions(txsData);

      // Safe parameter fetches with fallbacks
      let vesselsData = ["HD-38", "HD-29", "HD-68", "TMS Andaman"];
      let rigsData = ["GHTH", "SKL", "FREE ZONE", "RNG PORT"];
      try {
        const vRes = await fetch("/api/vessels");
        if (vRes.ok) {
          vesselsData = await vRes.json();
        }
      } catch (err) {
        console.warn("Vessels fetch failed:", err);
      }
      try {
        const rRes = await fetch("/api/rigs");
        if (rRes.ok) {
          rigsData = await rRes.json();
        }
      } catch (err) {
        console.warn("Rigs fetch failed:", err);
      }

      setVessels(vesselsData);
      setRigs(rigsData);
      setErrorStatus("");
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Could not synchronize database. Please verify your Express container server is online.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVessels = async (updatedVessels: string[]) => {
    try {
      const res = await fetch("/api/vessels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vessels: updatedVessels })
      });
      if (!res.ok) throw new Error("Could not update vessels list.");
      await fetchState();
    } catch (err: any) {
      alert("Error saving vessels list: " + err.message);
    }
  };

  const handleUpdateRigs = async (updatedRigs: string[]) => {
    try {
      const res = await fetch("/api/rigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rigs: updatedRigs })
      });
      if (!res.ok) throw new Error("Could not update rigs list.");
      await fetchState();
    } catch (err: any) {
      alert("Error saving rigs list: " + err.message);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleCreateAsset = async (newAsset: Asset) => {
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset)
      });
      if (!res.ok) throw new Error("Could not register asset.");
      
      // Re-fetch all data to ensure synchronicity
      await fetchState();
    } catch (err: any) {
      alert("Error adding asset: " + err.message);
    }
  };

  const handleCreateTransaction = async (txOrTxs: Omit<Transaction, "id"> | Omit<Transaction, "id">[]) => {
    try {
      const isArray = Array.isArray(txOrTxs);
      const url = isArray ? "/api/transactions/batch" : "/api/transactions";
      const bodyPayload = isArray ? { transactions: txOrTxs } : txOrTxs;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (!res.ok) throw new Error("Could not write transaction log.");

      // Re-fetch state
      await fetchState();
      
      // Auto switch to dashboard or keep tab to show user result
      setActiveTab("dashboard");
    } catch (err: any) {
      alert("Error logging transaction: " + err.message);
    }
  };

  const handleExportExcel = () => {
    // Direct link to download Multi-Sheet Excel endpoint (Feature E)
    window.open("/api/export", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans" id="applet-layout">
      {/* Top Professional Navigation Shell */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40" id="main-navigation-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight">RNG & CCU Asset Matrix</h1>
                <span className="text-[9px] bg-blue-500/25 text-blue-400 font-semibold px-1.5 py-0.2 rounded border border-blue-500/30">
                  v2.4 FULL-STACK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Warehouse Inventory, Certification & Logistical Ledger</p>
            </div>
          </div>

          {/* Action Row & User Profile */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Real Exporter Button (Feature E) */}
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-2 shadow-md shadow-emerald-500/10 cursor-pointer transition-colors"
              id="btn-export-excel-report"
              title="Download consolidated Multi-Sheet report (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel Report</span>
            </button>

            {/* Reload state button */}
            <button
              onClick={fetchState}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg cursor-pointer hover:text-white transition-colors"
              title="Sync Database"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-slate-800"></div>

            {/* QAQC Inspector Tag */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
              <div className="text-left">
                <p className="text-[9px] font-semibold text-slate-500 leading-none">PREPARED BY</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">Pousan Yangok (QAQC)</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Database sync status messages */}
      {errorStatus && (
        <div className="bg-red-950/80 border-b border-red-900 text-red-200 text-xs px-4 py-3 text-center flex items-center justify-center space-x-2">
          <span>⚠️</span>
          <span>{errorStatus}</span>
          <button onClick={fetchState} className="underline font-bold ml-2">Retry Connection</button>
        </div>
      )}

      {/* Sub Header for Tabs Switch controls */}
      <div className="bg-slate-950 border-b border-slate-800" id="tabs-navigation-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 text-xs text-slate-400 font-semibold pt-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pb-3.5 pt-4 transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Overall & Department Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`pb-3.5 pt-4 transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "database"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>CCU Master Database (1 Table)</span>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`pb-3.5 pt-4 transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "transactions"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Transact IN / OUT</span>
            </button>
            <button
              onClick={() => setActiveTab("checksheets")}
              className={`pb-3.5 pt-4 transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer relative ${
                activeTab === "checksheets"
                  ? "border-amber-500 text-amber-400 font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Backload Checksheets (TAT-BL)</span>
              <span className="absolute -top-1.5 -right-3 animate-pulse bg-amber-500 text-slate-950 font-black px-1 rounded-full text-[8px] border border-slate-950">
                TAT-BL
              </span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3.5 pt-4 transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
              id="tab-settings-admin"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Settings & Import/Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Core Body stage content container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="primary-stage-view">
        {loading && assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">Synchronizing metadata and ledger balances...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === "dashboard" && (
              <Dashboard 
                assets={assets} 
                onSelectOwner={setSelectedOwner} 
                selectedOwner={selectedOwner} 
              />
            )}

            {activeTab === "database" && (
              <AssetTable 
                assets={assets} 
                onAddAsset={handleCreateAsset} 
              />
            )}

            {activeTab === "transactions" && (
              <TransactionForm 
                assets={assets} 
                transactions={transactions} 
                onAddTransaction={handleCreateTransaction} 
                vessels={vessels}
                rigs={rigs}
              />
            )}

            {activeTab === "checksheets" && (
              <BackloadChecksheets 
                assets={assets} 
                onRefreshDatabase={fetchState} 
              />
            )}

            {activeTab === "settings" && (
              <Settings 
                onRefreshData={fetchState} 
                existingAssetsCount={assets.length} 
                vessels={vessels}
                rigs={rigs}
                onUpdateVessels={handleUpdateVessels}
                onUpdateRigs={handleUpdateRigs}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Branding Coordinates */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>RNG Oilfield Services QAQC Certified Asset Registry</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Current Session Timestamp: 2026-06-10 | Operating platform database synced with local JSON store.
          </p>
        </div>
      </footer>
    </div>
  );
}
