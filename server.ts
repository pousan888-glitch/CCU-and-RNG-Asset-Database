/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { AssetDbStore } from "./src/utils/dbStore";
import { AssetType, AssetStatus, TransactionType } from "./src/types";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JOSN body
  app.use(express.json());

  // 1. API: Get all warehouse assets
  app.get("/api/assets", (req, res) => {
    try {
      const assets = AssetDbStore.getAssets();
      res.json(assets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. API: Add or update a warehouse asset
  app.post("/api/assets", (req, res) => {
    try {
      const newAsset = req.body;
      if (!newAsset.ccuNumber || !newAsset.type || !newAsset.owner) {
        return res.status(400).json({ error: "ccuNumber, type, and owner are required fields." });
      }
      const saved = AssetDbStore.addAsset(newAsset);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Clear all database data
  app.post("/api/clear", (req, res) => {
    try {
      AssetDbStore.clearAllData();
      res.json({ success: true, message: "Database cleared successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Bulk import assets
  app.post("/api/assets/bulk", (req, res) => {
    try {
      const { assets, clearFirst } = req.body;
      if (!Array.isArray(assets)) {
        return res.status(400).json({ error: "assets must be an array" });
      }
      AssetDbStore.bulkImport(assets, !!clearFirst);
      res.json({ success: true, count: assets.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. API: Get all transaction history logs
  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = AssetDbStore.getTransactions();
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. API: Create a transaction (Load Out or Back Load) and auto-update asset
  app.post("/api/transactions", (req, res) => {
    try {
      const tx = req.body;
      if (!tx.ccuNumber || !tx.type || !tx.vessel || !tx.rig || !tx.segment) {
        return res.status(400).json({ error: "Missing required transaction logging fields." });
      }
      const saved = AssetDbStore.addTransaction(tx);
      
      // Auto-generate checksheet for backload
      if (tx.type === TransactionType.BACK_LOAD) {
        AssetDbStore.createChecksheetForCcus([tx.ccuNumber], tx.date);
      }
      
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Create batch transactions and auto-update assets
  app.post("/api/transactions/batch", (req, res) => {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: "Missing or invalid transactions array." });
      }
      for (const tx of transactions) {
        if (!tx.ccuNumber || !tx.type || !tx.vessel || !tx.rig || !tx.segment) {
          return res.status(400).json({ error: "Missing required transaction logging fields." });
        }
      }
      
      const savedList = [];
      const backloadCcuNumbers: string[] = [];
      let txDate: string | undefined = undefined;
      
      for (const tx of transactions) {
        const saved = AssetDbStore.addTransaction(tx);
        savedList.push(saved);
        if (tx.type === TransactionType.BACK_LOAD) {
          backloadCcuNumbers.push(tx.ccuNumber);
          if (!txDate) txDate = tx.date;
        }
      }
      
      // If any of the batch transactions were backloads, auto-group into checksheets (up to 5 CCUs per sheet)
      if (backloadCcuNumbers.length > 0) {
        for (let i = 0; i < backloadCcuNumbers.length; i += 5) {
          const chunk = backloadCcuNumbers.slice(i, i + 5);
          AssetDbStore.createChecksheetForCcus(chunk, txDate);
        }
      }
      
      res.status(201).json(savedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // BACKLOAD CHECKSHEETS ENDPOINTS
  // ==========================================
  app.get("/api/checksheets", (req, res) => {
    try {
      const sheets = AssetDbStore.getChecksheets();
      res.json(sheets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/checksheets", (req, res) => {
    try {
      const sheet = req.body;
      if (!sheet.id || !sheet.workOrderId || !Array.isArray(sheet.ccus)) {
        return res.status(400).json({ error: "id, workOrderId, and ccus array are required fields." });
      }
      const saved = AssetDbStore.saveChecksheet(sheet);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/checksheets/:id", (req, res) => {
    try {
      const id = req.params.id;
      AssetDbStore.deleteChecksheet(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get custom Vessels list
  app.get("/api/vessels", (req, res) => {
    try {
      res.json(AssetDbStore.getVessels());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Save custom Vessels list
  app.post("/api/vessels", (req, res) => {
    try {
      const { vessels } = req.body;
      if (!Array.isArray(vessels)) {
        return res.status(400).json({ error: "vessels must be an array of strings" });
      }
      AssetDbStore.setVessels(vessels);
      res.json({ success: true, vessels: AssetDbStore.getVessels() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get custom Rigs list
  app.get("/api/rigs", (req, res) => {
    try {
      res.json(AssetDbStore.getRigs());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Save custom Rigs list
  app.post("/api/rigs", (req, res) => {
    try {
      const { rigs } = req.body;
      if (!Array.isArray(rigs)) {
        return res.status(400).json({ error: "rigs must be an array of strings" });
      }
      AssetDbStore.setRigs(rigs);
      res.json({ success: true, rigs: AssetDbStore.getRigs() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. API: Multi-Sheet Excel Export (Feature E)
  app.get("/api/export", async (req, res) => {
    try {
      const assets = AssetDbStore.getAssets();
      const transactions = AssetDbStore.getTransactions();

      const wb = new ExcelJS.Workbook();
      const fontCalibri = "Calibri";

      const thinBorder = {
        top: { style: "thin" as any, color: { argb: "FFA0A0A0" } },
        left: { style: "thin" as any, color: { argb: "FFA0A0A0" } },
        bottom: { style: "thin" as any, color: { argb: "FFA0A0A0" } },
        right: { style: "thin" as any, color: { argb: "FFA0A0A0" } }
      };

      // Helper function to style ranges of cells (including merged cells nicely)
      const styleRange = (ws: any, range: string, style: any) => {
        const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!match) return;
        const [, startColName, startRowStr, endColName, endRowStr] = match;
        
        const colLetterToNum = (letter: string) => {
          let num = 0;
          for (let i = 0; i < letter.length; i++) {
            num = num * 26 + (letter.charCodeAt(i) - 64);
          }
          return num;
        };

        const startCol = colLetterToNum(startColName);
        const startRow = parseInt(startRowStr);
        const endCol = colLetterToNum(endColName);
        const endRow = parseInt(endRowStr);

        for (let r = startRow; r <= endRow; r++) {
          const row = ws.getRow(r);
          for (let c = startCol; c <= endCol; c++) {
            const cell = row.getCell(c);
            if (style.font) cell.font = { ...cell.font, ...style.font };
            if (style.fill) cell.fill = { ...cell.fill, ...style.fill };
            if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
            if (style.border) cell.border = { ...cell.border, ...style.border };
          }
        }
      };

      // Create a nice human date like "12-Jun-26"
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const d = new Date();
      const dateNum = d.getDate();
      const monthStr = months[d.getMonth()];
      const yearStr = String(d.getFullYear()).slice(-2);
      const currentDateFormatted = `${dateNum}-${monthStr}-${yearStr}`;

      // ==========================================
      // SHEET 1: Daily report CMT
      // ==========================================
      const ws_cmt = wb.addWorksheet("Daily report CMT", {
        views: [{ showGridLines: true }]
      });

      // Configure explicit column widths to prevent wrapping
      ws_cmt.columns = [
        { width: 22 }, // A: CCU
        { width: 14 }, // B: All CCU
        { width: 24 }, // C: Ready to use in warehouse
        { width: 18 }, // D: In Plan (Booking)
        { width: 14 }, // E: Service (IN)
        { width: 14 }, // F: Out Going
        { width: 24 }  // G: Undergoing Backload
      ];

      // Merge headers
      ws_cmt.mergeCells("A1:A2");
      ws_cmt.mergeCells("B1:B2");
      ws_cmt.mergeCells("C1:G1");
      ws_cmt.mergeCells("C2:E2");
      ws_cmt.mergeCells("F2:G2");

      // Set values for headers
      ws_cmt.getCell("A1").value = "TODAY";
      ws_cmt.getCell("B1").value = currentDateFormatted;
      ws_cmt.getCell("C1").value = "All CCU CMT";
      ws_cmt.getCell("C2").value = "In RNG FZ, RNG OFS Warehouse";
      ws_cmt.getCell("F2").value = "on location";

      // Style row 1 & 2 cells
      styleRange(ws_cmt, "A1:A2", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FF000000" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6E0B4" } }, // Soft green
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      styleRange(ws_cmt, "B1:B2", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FF000000" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6E0B4" } }, // Soft green
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      styleRange(ws_cmt, "C1:G1", {
        font: { name: fontCalibri, size: 15, bold: true, color: { argb: "FF000000" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } }, // Bright green
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      styleRange(ws_cmt, "C2:E2", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } }, // White text
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF385723" } }, // Dark green
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      styleRange(ws_cmt, "F2:G2", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } }, // White text
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC65911" } }, // Rust/dark orange
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      // Headers Row 3
      const headersCmt = [
        "CCU",
        "All CCU",
        "Ready to use in warehouse",
        "In Plan (Booking)",
        "Service (IN)",
        "Out Going",
        "Undergoing Backload"
      ];
      const row3 = ws_cmt.getRow(3);
      row3.height = 25;
      headersCmt.forEach((h, i) => {
        row3.getCell(i + 1).value = h;
      });

      styleRange(ws_cmt, "A3:G3", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FF000000" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } }, // Light gray
        alignment: { vertical: "middle", horizontal: "center", wrapText: true },
        border: thinBorder
      });

      // Data Rows 4 to 9
      const cmtAssets = assets.filter(a => a.owner === "CMT");
      const assetTypes = [
        AssetType.PALLET_CARRIER,
        AssetType.TOTE_TANK,
        AssetType.BASKET,
        AssetType.CONTAINER,
        AssetType.SKID,
        AssetType.TOOL_BOX
      ];

      assetTypes.forEach((t, idx) => {
        const rNum = 4 + idx;
        const row = ws_cmt.getRow(rNum);
        row.height = 20;

        const total = cmtAssets.filter(a => a.type === t).length;
        const ready = cmtAssets.filter(a => a.type === t && a.status === AssetStatus.READY).length;
        const inPlan = cmtAssets.filter(a => a.type === t && a.status === AssetStatus.IN_PLAN).length;
        const service = cmtAssets.filter(a => a.type === t && a.status === AssetStatus.SERVICE).length;
        const outgoing = cmtAssets.filter(a => a.type === t && a.status === AssetStatus.OUT_GOING).length;
        const backload = cmtAssets.filter(a => a.type === t && a.status === AssetStatus.UNDERGOING_BACKLOAD).length;

        row.getCell(1).value = t;
        row.getCell(2).value = total;
        row.getCell(3).value = ready;
        row.getCell(4).value = inPlan;
        row.getCell(5).value = service;
        row.getCell(6).value = outgoing;
        row.getCell(7).value = backload;

        // Apply visual styling exactly like the user's second screenshot
        // CCU col A: Steel blue text, soft light gray background
        const cellA = row.getCell(1);
        cellA.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF1F4E79" } };
        cellA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        cellA.alignment = { vertical: "middle", horizontal: "center" };
        cellA.border = thinBorder;

        // All CCU col B: Bold red text
        const cellB = row.getCell(2);
        cellB.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FFC00000" } };
        cellB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        cellB.alignment = { vertical: "middle", horizontal: "center" };
        cellB.border = thinBorder;

        // Ready col C: Bold green text
        const cellC = row.getCell(3);
        cellC.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF375623" } };
        cellC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        cellC.alignment = { vertical: "middle", horizontal: "center" };
        cellC.border = thinBorder;

        // In Plan (col D): Bold Blue. Highlight Yellow if > 0
        const cellD = row.getCell(4);
        cellD.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF1F4E79" } };
        cellD.alignment = { vertical: "middle", horizontal: "center" };
        cellD.border = thinBorder;
        if (inPlan > 0) {
          cellD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
        } else {
          cellD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        }

        // Service (col E): Bold Slate
        const cellE = row.getCell(5);
        cellE.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF595959" } };
        cellE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        cellE.alignment = { vertical: "middle", horizontal: "center" };
        cellE.border = thinBorder;

        // Out Going (col F): Dark text
        const cellF = row.getCell(6);
        cellF.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF333333" } };
        cellF.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        cellF.alignment = { vertical: "middle", horizontal: "center" };
        cellF.border = thinBorder;

        // Undergoing Backload (col G): Purple. Highlight Yellow if > 0
        const cellG = row.getCell(7);
        cellG.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF7030A0" } };
        cellG.alignment = { vertical: "middle", horizontal: "center" };
        cellG.border = thinBorder;
        if (backload > 0) {
          cellG.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
        } else {
          cellG.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
        }
      });

      // Row 10: Summary Totals
      const row10 = ws_cmt.getRow(10);
      row10.height = 24;

      const grandTotalCol = cmtAssets.length;
      const totalReady = cmtAssets.filter(a => a.status === AssetStatus.READY).length;
      const totalInPlan = cmtAssets.filter(a => a.status === AssetStatus.IN_PLAN).length;
      const totalService = cmtAssets.filter(a => a.status === AssetStatus.SERVICE).length;
      const totalOutgoing = cmtAssets.filter(a => a.status === AssetStatus.OUT_GOING).length;
      const totalBackload = cmtAssets.filter(a => a.status === AssetStatus.UNDERGOING_BACKLOAD).length;

      const warehouseCombined = totalReady + totalInPlan + totalService;
      const locationCombined = totalOutgoing + totalBackload;

      row10.getCell(1).value = "Total";
      row10.getCell(2).value = grandTotalCol;
      row10.getCell(3).value = warehouseCombined; // Top-left of merged C10:E10
      row10.getCell(6).value = locationCombined;  // Top-left of merged F10:G10

      ws_cmt.mergeCells("A10:A10");
      ws_cmt.mergeCells("B10:B10");
      ws_cmt.mergeCells("C10:E10");
      ws_cmt.mergeCells("F10:G10");

      // Style Total cells
      const cellTotalA = row10.getCell(1);
      cellTotalA.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF000000" } };
      cellTotalA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
      cellTotalA.alignment = { vertical: "middle", horizontal: "center" };
      cellTotalA.border = thinBorder;

      const cellTotalB = row10.getCell(2);
      cellTotalB.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FF000000" } };
      cellTotalB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
      cellTotalB.alignment = { vertical: "middle", horizontal: "center" };
      cellTotalB.border = thinBorder;

      styleRange(ws_cmt, "C10:E10", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FF385723" } }, // green font
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFA9D08E" } }, // green background
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      styleRange(ws_cmt, "F10:G10", {
        font: { name: fontCalibri, size: 11, bold: true, color: { argb: "FFC65911" } }, // orange font
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4B084" } }, // orange background
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      // Definitions Section (from row 12)
      ws_cmt.mergeCells("A12:B12");
      ws_cmt.getCell("A12").value = "Definitions";
      styleRange(ws_cmt, "A12:B12", {
        font: { name: fontCalibri, size: 10, bold: true, color: { argb: "FF000000" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder
      });

      ws_cmt.mergeCells("B13:C13");
      ws_cmt.getCell("A13").value = "BL";
      ws_cmt.getCell("B13").value = "Undergoing Backload AT RNG PORT";
      styleRange(ws_cmt, "A13:C13", {
        font: { name: fontCalibri, size: 9, bold: true, color: { argb: "FF595959" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
        alignment: { vertical: "middle", horizontal: "left" },
        border: thinBorder
      });
      ws_cmt.getCell("A13").alignment = { vertical: "middle", horizontal: "center" };

      ws_cmt.mergeCells("B14:C14");
      ws_cmt.getCell("A14").value = "IPB";
      ws_cmt.getCell("B14").value = "In Plan (Booking) AT RNG FZ";
      styleRange(ws_cmt, "A14:C14", {
        font: { name: fontCalibri, size: 9, bold: true, color: { argb: "FF595959" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
        alignment: { vertical: "middle", horizontal: "left" },
        border: thinBorder
      });
      ws_cmt.getCell("A14").alignment = { vertical: "middle", horizontal: "center" };


      // ==========================================
      // SHEET 2: Load Out
      // ==========================================
      const ws_loadout = wb.addWorksheet("Load Out", {
        views: [{ showGridLines: true }]
      });

      ws_loadout.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "CCU Number (S/N)", key: "ccuNumber", width: 22 },
        { header: "Type", key: "type", width: 18 },
        { header: "Date", key: "date", width: 14 },
        { header: "VESSEL", key: "vessel", width: 18 },
        { header: "RIG", key: "rig", width: 18 },
        { header: "SEGMENT", key: "segment", width: 18 }
      ];

      // Style Load Out Header Row
      const loHeader = ws_loadout.getRow(1);
      loHeader.height = 26;
      loHeader.eachCell(cell => {
        cell.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }; // Deep corporate blue
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });

      const loadOuts = transactions
        .filter(t => t.type === TransactionType.LOAD_OUT)
        .map((t, idx) => ({
          no: idx + 1,
          ccuNumber: t.ccuNumber,
          type: t.assetType,
          date: new Date(t.date).toLocaleDateString("en-GB"),
          vessel: t.vessel,
          rig: t.rig,
          segment: t.segment
        }));

      loadOuts.forEach((row, i) => {
        const addedRow = ws_loadout.addRow(row);
        addedRow.height = 20;
        const isAlt = i % 2 === 1;
        addedRow.eachCell(cell => {
          cell.font = { name: fontCalibri, size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
          if (isAlt) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
          }
        });
      });


      // ==========================================
      // SHEET 3: Back Load
      // ==========================================
      const ws_backload = wb.addWorksheet("Back Load", {
        views: [{ showGridLines: true }]
      });

      ws_backload.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "CCU Number (S/N)", key: "ccuNumber", width: 22 },
        { header: "Type", key: "type", width: 18 },
        { header: "Date", key: "date", width: 14 },
        { header: "VESSEL", key: "vessel", width: 18 },
        { header: "RIG", key: "rig", width: 18 },
        { header: "SEGMENT", key: "segment", width: 18 },
        { header: "Remarks/Defect Symptoms", key: "remark", width: 28 }
      ];

      // Style Back Load Header Row
      const blHeader = ws_backload.getRow(1);
      blHeader.height = 26;
      blHeader.eachCell(cell => {
        cell.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }; 
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });

      const backLoads = transactions
        .filter(t => t.type === TransactionType.BACK_LOAD)
        .map((t, idx) => ({
          no: idx + 1,
          ccuNumber: t.ccuNumber,
          type: t.assetType,
          date: new Date(t.date).toLocaleDateString("en-GB"),
          vessel: t.vessel,
          rig: t.rig,
          segment: t.segment,
          remark: t.remark || "OK"
        }));

      backLoads.forEach((row, i) => {
        const addedRow = ws_backload.addRow(row);
        addedRow.height = 20;
        const isAlt = i % 2 === 1;
        addedRow.eachCell(cell => {
          cell.font = { name: fontCalibri, size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
          if (isAlt) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
          }
        });
      });


      // ==========================================
      // SHEET 4: DATA BASE
      // ==========================================
      const ws_db = wb.addWorksheet("DATA BASE", {
        views: [{ showGridLines: true }]
      });

      ws_db.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "CCU Number (S/N)", key: "ccuNumber", width: 22 },
        { header: "Type", key: "type", width: 18 },
        { header: "Status", key: "status", width: 18 },
        { header: "Owner/Segment", key: "owner", width: 16 },
        { header: "Area", key: "area", width: 16 },
        { header: "Chemicals", key: "chemicals", width: 14 },
        { header: "Visual Expiry Date", key: "visualExp", width: 18 },
        { header: "MPI Expiry Date", key: "mpiExp", width: 18 },
        { header: "Width (cm)", key: "w", width: 12 },
        { header: "Length (cm)", key: "l", width: 12 },
        { header: "Height (cm)", key: "h", width: 12 },
        { header: "Tare Weight (kg)", key: "tare", width: 16 },
        { header: "Payload (kg)", key: "payload", width: 14 },
        { header: "Gross Weight (kg)", key: "gross", width: 16 },
        { header: "Remark", key: "remark", width: 22 }
      ];

      // Style Database Header Row
      const dbHeader = ws_db.getRow(1);
      dbHeader.height = 26;
      dbHeader.eachCell(cell => {
        cell.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }; 
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });

      const dbRows = assets.map((a, idx) => ({
        no: idx + 1,
        ccuNumber: a.ccuNumber,
        type: a.type,
        status: a.status,
        owner: a.owner,
        area: a.area || "-",
        chemicals: a.chemicals || "-",
        visualExp: a.visualExpiraDate || "-",
        mpiExp: a.mpiExpiraDate || "-",
        w: a.widthCm || "-",
        l: a.lengthCm || "-",
        h: a.heightCm || "-",
        tare: a.tareWeightKg || "-",
        payload: a.payloadKg || "-",
        gross: a.grossWeightKg || "-",
        remark: a.remark || "-"
      }));

      dbRows.forEach((row, i) => {
        const addedRow = ws_db.addRow(row);
        addedRow.height = 20;
        const isAlt = i % 2 === 1;
        addedRow.eachCell(cell => {
          cell.font = { name: fontCalibri, size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
          if (isAlt) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
          }
        });
      });


      // ==========================================
      // SHEET 5: STATUS ALL CCU
      // ==========================================
      const ws_status_all = wb.addWorksheet("STATUS ALL CCU", {
        views: [{ showGridLines: true }]
      });

      ws_status_all.columns = [
        { header: "CCU Type", key: "ccuType", width: 22 },
        { header: "All CCU", key: "allCcu", width: 14 },
        { header: "Ready to use", key: "ready", width: 16 },
        { header: "In Plan (Booking)", key: "inPlan", width: 18 },
        { header: "Service (IN)", key: "service", width: 14 },
        { header: "Out Going", key: "outgoing", width: 14 },
        { header: "Undergoing Backload", key: "backload", width: 20 }
      ];

      // Style Status All Header Row
      const saHeader = ws_status_all.getRow(1);
      saHeader.height = 26;
      saHeader.eachCell(cell => {
        cell.font = { name: fontCalibri, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }; 
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });

      const statusAllRows = Object.values(AssetType).map(t => {
        const typeAssets = assets.filter(a => a.type === t);
        return {
          ccuType: t,
          allCcu: typeAssets.length,
          ready: typeAssets.filter(a => a.status === AssetStatus.READY).length,
          inPlan: typeAssets.filter(a => a.status === AssetStatus.IN_PLAN).length,
          service: typeAssets.filter(a => a.status === AssetStatus.SERVICE).length,
          outgoing: typeAssets.filter(a => a.status === AssetStatus.OUT_GOING).length,
          backload: typeAssets.filter(a => a.status === AssetStatus.UNDERGOING_BACKLOAD).length
        };
      });

      const totalAllAssets = assets.length;
      statusAllRows.push({
        ccuType: "Total" as any,
        allCcu: totalAllAssets,
        ready: assets.filter(a => a.status === AssetStatus.READY).length,
        inPlan: assets.filter(a => a.status === AssetStatus.IN_PLAN).length,
        service: assets.filter(a => a.status === AssetStatus.SERVICE).length,
        outgoing: assets.filter(a => a.status === AssetStatus.OUT_GOING).length,
        backload: assets.filter(a => a.status === AssetStatus.UNDERGOING_BACKLOAD).length
      });

      statusAllRows.forEach((row, i) => {
        const addedRow = ws_status_all.addRow(row);
        const isTotal = i === statusAllRows.length - 1;
        addedRow.height = isTotal ? 24 : 20;

        addedRow.eachCell(cell => {
          cell.font = { name: fontCalibri, size: 10, bold: isTotal };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
          if (isTotal) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
          } else if (i % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
          }
        });
      });


      // Generate styled Excel buffer and stream
      const buffer = await wb.xlsx.writeBuffer();

      res.setHeader("Content-Disposition", "attachment; filename=RNG_CCU_Master_Report.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("Excel Export Error:", err);
      res.status(500).json({ error: "Failed to compile multi-sheet report." });
    }
  });

  // Serve Frontend assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully booted in full-stack mode on http://localhost:${PORT}`);
  });
}

startServer();
