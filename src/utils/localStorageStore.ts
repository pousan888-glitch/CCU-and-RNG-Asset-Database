/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, AssetType, AssetStatus, Transaction, TransactionType, BackloadChecksheet } from "../types";
import { getInitialAssets, getInitialTransactions } from "./initialData";

const LS_KEY = "rng_ccu_matrix_db";

interface DBStructure {
  assets: Asset[];
  transactions: Transaction[];
  vessels: string[];
  rigs: string[];
  checksheets: BackloadChecksheet[];
}

export class ClientDbStore {
  private static loadDb(): DBStructure {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const db: DBStructure = JSON.parse(raw);
        // Ensure arrays exist
        if (!db.assets) db.assets = [];
        if (!db.transactions) db.transactions = [];
        if (!db.vessels) db.vessels = ["HD-38", "HD-29", "HD-68", "TMS Andaman"];
        if (!db.rigs) db.rigs = ["GHTH", "SKL", "FREE ZONE", "RNG PORT"];
        if (!db.checksheets) db.checksheets = [];
        return db;
      }
    } catch (err) {
      console.error("Error reading localStorage, resetting:", err);
    }

    // Default Seed
    const db: DBStructure = {
      assets: getInitialAssets(),
      transactions: getInitialTransactions(),
      vessels: ["HD-38", "HD-29", "HD-68", "TMS Andaman"],
      rigs: ["GHTH", "SKL", "FREE ZONE", "RNG PORT"],
      checksheets: []
    };
    this.saveDb(db);
    return db;
  }

  private static saveDb(db: DBStructure): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch (err) {
      console.error("Error writing localStorage:", err);
    }
  }

  public static getAssets(): Asset[] {
    return this.loadDb().assets;
  }

  public static getTransactions(): Transaction[] {
    return this.loadDb().transactions;
  }

  public static getVessels(): string[] {
    return this.loadDb().vessels;
  }

  public static setVessels(vessels: string[]): void {
    const db = this.loadDb();
    db.vessels = vessels;
    this.saveDb(db);
  }

  public static getRigs(): string[] {
    return this.loadDb().rigs;
  }

  public static setRigs(rigs: string[]): void {
    const db = this.loadDb();
    db.rigs = rigs;
    this.saveDb(db);
  }

  public static clearAllData(): void {
    const db: DBStructure = {
      assets: [],
      transactions: [],
      vessels: ["HD-38", "HD-29", "HD-68", "TMS Andaman"],
      rigs: ["GHTH", "SKL", "FREE ZONE", "RNG PORT"],
      checksheets: []
    };
    this.saveDb(db);
  }

  public static bulkImport(newAssets: Asset[], clearFirst: boolean): void {
    const db = this.loadDb();
    if (clearFirst) {
      db.assets = newAssets;
    } else {
      newAssets.forEach(newAsset => {
        const idx = db.assets.findIndex(a => a.ccuNumber.toLowerCase() === newAsset.ccuNumber.toLowerCase());
        if (idx !== -1) {
          db.assets[idx] = { ...db.assets[idx], ...newAsset };
        } else {
          db.assets.push(newAsset);
        }
      });
    }
    this.saveDb(db);
  }

  public static addAsset(asset: Asset): Asset {
    const db = this.loadDb();
    const idx = db.assets.findIndex(a => a.ccuNumber.toLowerCase() === asset.ccuNumber.toLowerCase());
    if (idx !== -1) {
      db.assets[idx] = asset;
    } else {
      db.assets.push(asset);
    }
    this.saveDb(db);
    return asset;
  }

  public static addTransaction(tx: Omit<Transaction, "id">): Transaction {
    const db = this.loadDb();
    const id = `TX-${Date.now().toString().slice(-6)}`;
    const fullTx: Transaction = {
      id,
      ...tx
    };
    db.transactions.unshift(fullTx);

    // Automation status matching logic
    const assetIdx = db.assets.findIndex(a => a.ccuNumber.toLowerCase() === tx.ccuNumber.toLowerCase());
    if (assetIdx !== -1) {
      const targetAsset = db.assets[assetIdx];
      if (tx.type === TransactionType.LOAD_OUT) {
        targetAsset.status = AssetStatus.OUT_GOING;
        if (tx.rig) {
          targetAsset.area = tx.rig;
        }
        targetAsset.remark = "";
      } else if (tx.type === TransactionType.BACK_LOAD) {
        if (tx.remark && tx.remark.trim().length > 0) {
          targetAsset.status = AssetStatus.SERVICE;
          targetAsset.remark = tx.remark;
          targetAsset.area = "RNG PORT";
        } else {
          targetAsset.status = AssetStatus.READY;
          targetAsset.area = "FREE ZONE";
          targetAsset.remark = "";
        }
      }
      db.assets[assetIdx] = targetAsset;
    }

    this.saveDb(db);
    return fullTx;
  }

  public static getChecksheets(): BackloadChecksheet[] {
    return this.loadDb().checksheets;
  }

  public static saveChecksheet(sheet: BackloadChecksheet): BackloadChecksheet {
    const db = this.loadDb();
    if (!db.checksheets) db.checksheets = [];
    const idx = db.checksheets.findIndex(s => s.id === sheet.id);
    if (idx !== -1) {
      db.checksheets[idx] = sheet;
    } else {
      db.checksheets.unshift(sheet);
    }
    this.saveDb(db);
    return sheet;
  }

  public static deleteChecksheet(id: string): void {
    const db = this.loadDb();
    if (db.checksheets) {
      db.checksheets = db.checksheets.filter(s => s.id !== id);
      this.saveDb(db);
    }
  }

  public static createChecksheetForCcus(ccuNumbers: string[], dateStr?: string): BackloadChecksheet {
    const db = this.loadDb();
    if (!db.checksheets) db.checksheets = [];

    const count = db.checksheets.length + 1;
    const formattedId = `TAT-BL-${String(count).padStart(3, "0")}`;
    const formattedDate = dateStr ? dateStr.split("T")[0] : new Date().toISOString().split("T")[0];

    const newSheet: BackloadChecksheet = {
      id: formattedId,
      date: formattedDate,
      workOrderId: `WO-BL-${Date.now().toString().slice(-4)}`,
      qaqcInspector: "Pousan Yangok (QAQC)",
      ccus: ccuNumbers.map(ccu => {
        const asset = db.assets.find(a => a.ccuNumber.toLowerCase() === ccu.toLowerCase());
        
        let s1 = "", s2 = "", s3 = "", s4 = "";
        if (asset?.shackleId) {
          const val = asset.shackleId.trim();
          const matchRange = val.match(/^(.*?)\s*([A-Za-z])\s*(?:to|and|-)\s*(?:.*?\s*)?([A-Za-z])$/i);
          if (matchRange) {
            const prefix = matchRange[1].trim();
            const startChar = matchRange[2].toUpperCase().charCodeAt(0);
            const endChar = matchRange[3].toUpperCase().charCodeAt(0);
            if (endChar - startChar === 3) {
              s1 = `${prefix} ${String.fromCharCode(startChar)}`.trim();
              s2 = `${prefix} ${String.fromCharCode(startChar + 1)}`.trim();
              s3 = `${prefix} ${String.fromCharCode(startChar + 2)}`.trim();
              s4 = `${prefix} ${String.fromCharCode(startChar + 3)}`.trim();
            } else if (endChar - startChar < 10 && endChar - startChar > 0) {
              s1 = `${prefix} ${String.fromCharCode(startChar)}`.trim();
              if (endChar - startChar >= 1) s2 = `${prefix} ${String.fromCharCode(startChar + 1)}`.trim();
              if (endChar - startChar >= 2) s3 = `${prefix} ${String.fromCharCode(startChar + 2)}`.trim();
              if (endChar - startChar >= 3) s4 = `${prefix} ${String.fromCharCode(startChar + 3)}`.trim();
            }
          }
          if (!s1) {
            const parts = val.split(/[,/;]|\s+and\s+/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 1) s1 = parts[0];
            if (parts.length >= 2) s2 = parts[1];
            if (parts.length >= 3) s3 = parts[2];
            if (parts.length >= 4) s4 = parts[3];
          }
          if (!s1) {
            s1 = val;
          }
        }

        return {
          ccuNumber: ccu.toUpperCase().trim(),
          qrCode: "Yes" as const,
          loadTest: false,
          visualInspection3rd: false,
          ndt: false,
          slingNo: asset?.slingId || "",
          shackle1No: s1,
          shackle2No: s2,
          shackle3No: s3,
          shackle4No: s4,
          ccuNamePassed: "Yes" as const,
          dimensionPassed: "Yes" as const,
          weightPassed: "Yes" as const,
          conditionSlingPassed: "Yes" as const,
          colorCodePassed: "Yes" as const,
          lightPaintingPassed: "Yes" as const,
          colorCoatingsEdgesPassed: "Yes" as const,
          namePlatePassed: "Yes" as const,
          tagLinePassed: "Yes" as const,
          cleaningPassed: "Yes" as const,
          lockingDevicePassed: "Yes" as const,
          rackSupportPassed: "Yes" as const,
          structuralRepairPassed: "Yes" as const,
          fullBodyPaintingPassed: "Yes" as const,
          replaceSlingPassed: "Yes" as const,
          legSupportPassed: "Yes" as const,
          remark: asset?.remark || ""
        };
      })
    };

    db.checksheets.unshift(newSheet);
    this.saveDb(db);
    return newSheet;
  }
}
