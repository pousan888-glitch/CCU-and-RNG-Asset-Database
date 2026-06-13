/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Asset, AssetType, AssetStatus, Transaction, TransactionType, BackloadChecksheet, ChecklistCcuCol } from "../types";
import { getInitialAssets, getInitialTransactions } from "./initialData";

const DB_PATH = path.join(process.cwd(), "database.json");

interface DBStructure {
  assets: Asset[];
  transactions: Transaction[];
  vessels?: string[];
  rigs?: string[];
  checksheets?: BackloadChecksheet[];
}

export class AssetDbStore {
  private static loadDb(): DBStructure {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const db: DBStructure = JSON.parse(raw);
        
        let migrated = false;
        if (db.assets && Array.isArray(db.assets)) {
          db.assets = db.assets.map(asset => {
            if (asset.lengthCm && !asset.widthCm) {
              // Auto heal width based on the precise matching dimension specifications
              let healedWidth: number | undefined = undefined;
              const l = asset.lengthCm;
              const h = asset.heightCm;

              if (l === 189 && h === 146) healedWidth = 183;
              else if (l === 107 && h === 191) healedWidth = 122;
              else if (l === 396 && h === 176) healedWidth = 168;
              else if (l === 630 && h === 122) healedWidth = 142;
              else if (l === 105 && h === 190) healedWidth = 110;
              else if (l === 650 && h === 100) healedWidth = 136;
              else if (l === 125 && h === 194) healedWidth = 110;
              else if (l === 124 && h === 194) healedWidth = 110;
              else if (l === 144 && h === 134) healedWidth = 144;
              else if (l === 705 && h === 50) healedWidth = 115;
              else if (l === 1189 && h === 110) healedWidth = 122;
              else if (l === 168 && h === 173) healedWidth = 159;
              else if (l === 254 && h === 238) healedWidth = 99;
              else if (l === 606 && h === 144) healedWidth = 244;
              else if (l === 606 && h === 129) healedWidth = 244;
              else if (l === 155 && h === 30) healedWidth = 155;
              else if (l === 112 && h === 30) healedWidth = 114;
              else if (l === 606 && h === 259) healedWidth = 244;
              else if (l === 159 && h === 291) healedWidth = 186;
              else if (l === 159 && h === 292) healedWidth = 186;
              else if (l === 300 && h === 200) healedWidth = 200;
              else if (l === 244 && h === 261) healedWidth = 122;
              else if (l === 183 && h === 244) healedWidth = 183;
              else if (l === 160 && h === 133) healedWidth = 79;
              else if (l === 160 && h === 143) healedWidth = 109;
              else if (l === 107 && h === 122) healedWidth = 122;
              else if (l === 110 && h === 190) healedWidth = 105;
              else if (l === 122 && h === 191) healedWidth = 110;
              else if (l === 299 && h === 259) healedWidth = 244;
              else if (l === 155 && h === 30) healedWidth = 155;
              else {
                // Heuristic mapping defaults
                if (asset.type === AssetType.PALLET_CARRIER) healedWidth = 155;
                else if (asset.type === AssetType.TOTE_TANK) healedWidth = 110;
                else healedWidth = l; // fallback to length
              }

              if (healedWidth !== undefined) {
                asset.widthCm = healedWidth;
                migrated = true;
              }
            }
            return asset;
          });
        }

        if (migrated) {
          try {
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
          } catch (e) {
            console.error("Migration file write error:", e);
          }
        }
        return db;
      }
    } catch (err) {
      console.error("Error reading database file, resetting to initial seed:", err);
    }

    // Seed database if it does not exist
    const db: DBStructure = {
      assets: getInitialAssets(),
      transactions: getInitialTransactions(),
      vessels: ["HD-38", "HD-29", "HD-68", "TMS Andaman"],
      rigs: ["GHTH", "SKL", "FREE ZONE", "RNG PORT"],
      checksheets: []
    };
    AssetDbStore.saveDb(db);
    return db;
  }

  private static saveDb(db: DBStructure): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing database file:", err);
    }
  }

  public static getVessels(): string[] {
    const db = this.loadDb();
    if (!db.vessels || db.vessels.length === 0) {
      return ["HD-38", "HD-29", "HD-68", "TMS Andaman"];
    }
    return db.vessels;
  }

  public static setVessels(vessels: string[]): void {
    const db = this.loadDb();
    db.vessels = vessels;
    this.saveDb(db);
  }

  public static getRigs(): string[] {
    const db = this.loadDb();
    if (!db.rigs || db.rigs.length === 0) {
      return ["GHTH", "SKL", "FREE ZONE", "RNG PORT"];
    }
    return db.rigs;
  }

  public static setRigs(rigs: string[]): void {
    const db = this.loadDb();
    db.rigs = rigs;
    this.saveDb(db);
  }

  /**
   * Swapping with a real database in Production:
   * 
   * To connect a relational database (like PostgreSQL, MySQL, SQL Server) or MongoDB:
   * 
   * 1. Install your DB driver or ORM (e.g., pg, pg-promise, mongoose, or drizzle-orm, prisma).
   * 
   * 2. Configure a database connection pool:
   *    ```ts
   *    import { Pool } from 'pg';
   *    const pool = new Pool({
   *      connectionString: process.env.DATABASE_URL, // e.g., postgresql://user:pass@localhost:5432/my_ccu_db
   *    });
   *    ```
   * 
   * 3. Replace the local methods below with asynchronous database queries. For instance, getAssets() would become:
   *    ```ts
   *    public static async getAssets(): Promise<Asset[]> {
   *      const res = await pool.query('SELECT * FROM assets ORDER BY ccu_number ASC');
   *      return res.rows.map(row => mapRowToAsset(row));
   *    }
   *    ```
   */

  public static getAssets(): Asset[] {
    return this.loadDb().assets;
  }

  public static getTransactions(): Transaction[] {
    return this.loadDb().transactions;
  }

  public static clearAllData(): void {
    const db: DBStructure = {
      assets: [],
      transactions: []
    };
    this.saveDb(db);
  }

  public static bulkImport(newAssets: Asset[], clearFirst: boolean): void {
    const db = this.loadDb();
    if (clearFirst) {
      db.assets = newAssets;
    } else {
      // Merge assets: replace if ccuNumber already exists, otherwise add
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
    // Check if asset already exists, overwrite or insert
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
    db.transactions.unshift(fullTx); // Put latest transactions at the top

    // --- FEATURE A: AUTOMATED STATUS LOGIC ---
    // Update the matching asset status dynamically
    const assetIdx = db.assets.findIndex(a => a.ccuNumber.toLowerCase() === tx.ccuNumber.toLowerCase());
    if (assetIdx !== -1) {
      const targetAsset = db.assets[assetIdx];
      
      if (tx.type === TransactionType.LOAD_OUT) {
        // "Load Out" action updates status to "Out Going"
        targetAsset.status = AssetStatus.OUT_GOING;
        // Move area to the chosen destination (or keep rig)
        if (tx.rig) {
          targetAsset.area = tx.rig;
        }
        // Remove transient repair remarks if it's dispatched
        targetAsset.remark = "";
      } else if (tx.type === TransactionType.BACK_LOAD) {
        // "Back Load" action updates status:
        // - If there is a repair remark, change status to "Service (IN)" and store description
        // - Otherwise, change back to warehouse: "Ready to use in warehouse"
        if (tx.remark && tx.remark.trim().length > 0) {
          targetAsset.status = AssetStatus.SERVICE;
          targetAsset.remark = tx.remark;
          targetAsset.area = "RNG PORT"; // Port processing or storage
        } else {
          targetAsset.status = AssetStatus.READY;
          targetAsset.area = "FREE ZONE"; // Back in main warehouse
          targetAsset.remark = "";
        }
      }
      db.assets[assetIdx] = targetAsset;
    }

    this.saveDb(db);
    return fullTx;
  }

  public static getChecksheets(): BackloadChecksheet[] {
    const db = this.loadDb();
    return db.checksheets || [];
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

    // Let's create a clean serial starting with TAT-BL-XX
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
        return {
          ccuNumber: ccu.toUpperCase().trim(),
          qrCode: "Yes" as const,
          loadTest: false,
          visualInspection3rd: false,
          ndt: false,
          slingNo: "",
          shackle1No: "",
          shackle2No: "",
          shackle3No: "",
          shackle4No: "",
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
