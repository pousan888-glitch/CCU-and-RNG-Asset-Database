/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, AssetType, AssetStatus, Transaction, TransactionType } from "../types";

// Base assets from the OCR analysis
export function getInitialAssets(): Asset[] {
  const assets: Asset[] = [];

  // 1. Generate CMT Assets (exactly 106 records to match the "All CCU CMT" report, PDF 2)
  // TOTAL: 106, split into:
  // - Pallet Carrier (25): 19 Ready, 0 In Plan, 1 Service (IN), 5 Out Going, 0 Undergoing Backload
  // - Tote Tank (64): 22 Ready, 0 In Plan, 2 Service (IN), 40 Out Going, 0 Undergoing Backload
  // - Basket (10): 3 Ready, 0 In Plan, 0 Service (IN), 7 Out Going, 0 Undergoing Backload
  // - Skid (7): 1 Ready, 0 In Plan, 0 Service (IN), 6 Out Going, 0 Undergoing Backload
  // - Container (0)
  // - Tool Box (0)

  // CMT Pallet Carriers (25)
  for (let i = 1; i <= 25; i++) {
    let status = AssetStatus.READY;
    let area = "FREE ZONE";
    let remark = "";
    if (i === 1) {
      status = AssetStatus.SERVICE;
      area = "LOCAL FZ";
      remark = "Defective locking pins - Needs repair";
    } else if (i > 20) {
      status = AssetStatus.OUT_GOING;
      area = "GHTH";
    }

    const mpiDate = i % 5 === 0 ? "2026-05-20" : i % 7 === 0 ? "2026-06-22" : "2027-01-15"; // Some expired/warning
    const visualDate = i % 5 === 0 ? "2026-05-20" : i % 8 === 0 ? "2026-07-05" : "2026-12-10";

    assets.push({
      ccuNumber: `CHR-PLC-CMT-${i.toString().padStart(4, "0")}`,
      type: AssetType.PALLET_CARRIER,
      owner: "CMT",
      area,
      status,
      visualExpiraDate: visualDate,
      mpiExpiraDate: mpiDate,
      remark,
      chemicals: i % 4 === 0 ? "D272" : undefined,
      lengthCm: 155,
      widthCm: 155,
      heightCm: 30,
      tareWeightKg: 250,
      payloadKg: 2400,
      grossWeightKg: 2650
    });
  }

  // CMT Tote Tanks (64)
  for (let i = 1; i <= 64; i++) {
    let status = AssetStatus.READY;
    let area = "FREE ZONE";
    let remark = "";

    if (i <= 2) {
      status = AssetStatus.SERVICE;
      area = "RNG PORT";
      remark = i === 1 ? "Issue Found: Tank lid gasket leak" : "Body deformation/dent at the corner";
    } else if (i > 24) {
      status = AssetStatus.OUT_GOING;
      area = "GHTH";
    }

    const mpiDate = i % 6 === 0 ? "2026-04-10" : i % 9 === 0 ? "2026-06-30" : "2027-02-18";
    const visualDate = i % 6 === 0 ? "2026-04-10" : i % 10 === 0 ? "2026-07-02" : "2026-11-20";

    assets.push({
      ccuNumber: `TXP-TTC-AAA-${i.toString().padStart(3, "0")}`,
      type: AssetType.TOTE_TANK,
      owner: "CMT",
      area,
      status,
      visualExpiraDate: visualDate,
      mpiExpiraDate: mpiDate,
      remark,
      chemicals: i % 5 === 0 ? "D168A" : i % 7 === 0 ? "D155A" : undefined,
      lengthCm: 125,
      widthCm: 110,
      heightCm: 194,
      tareWeightKg: 294,
      payloadKg: 3876,
      grossWeightKg: 4170
    });
  }

  // CMT Baskets (10)
  for (let i = 1; i <= 10; i++) {
    let status = AssetStatus.READY;
    let area = "FREE ZONE";

    if (i > 3) {
      status = AssetStatus.OUT_GOING;
      area = "GHTH";
    }

    const mpiDate = i % 3 === 0 ? "2026-05-15" : "2026-11-10";
    const visualDate = i % 3 === 0 ? "2026-05-15" : "2026-11-10";

    assets.push({
      ccuNumber: `BSO-BKT-CMT-${i.toString().padStart(3, "0")}`,
      type: AssetType.BASKET,
      owner: "CMT",
      area,
      status,
      visualExpiraDate: visualDate,
      mpiExpiraDate: mpiDate,
      lengthCm: 189,
      widthCm: 183,
      heightCm: 146,
      tareWeightKg: 1134,
      payloadKg: 4764,
      grossWeightKg: 5898
    });
  }

  // CMT Skids (7)
  for (let i = 1; i <= 7; i++) {
    let status = AssetStatus.READY;
    let area = "FREE ZONE";

    if (i > 1) {
      status = AssetStatus.OUT_GOING;
      area = "GHTH";
    }

    assets.push({
      ccuNumber: `SKD-SKL-CMT-${i.toString().padStart(3, "0")}`,
      type: AssetType.SKID,
      owner: "CMT",
      area,
      status,
      visualExpiraDate: "2026-09-22",
      mpiExpiraDate: "2026-09-05",
      lengthCm: 160,
      widthCm: 109,
      heightCm: 143,
      tareWeightKg: 800,
      payloadKg: 3200,
      grossWeightKg: 4000
    });
  }

  // 2. Generate Non-CMT Assets (WL, Testing, Slickline, etc.)
  // Let's create another ~50 records for realistic diversity
  const departments = ["WL", "Testing", "Slickline"];
  const areas = ["FREE ZONE", "COSL GIFT", "RAYONG", "BLUE WHALE 1", "RNG PORT"];

  for (let i = 101; i <= 150; i++) {
    const dIdx = i % departments.length;
    const dept = departments[dIdx];
    const type = i % 6 === 0 ? AssetType.CONTAINER : i % 5 === 0 ? AssetType.TOOL_BOX : i % 2 === 0 ? AssetType.SKID : AssetType.BASKET;
    const status = i % 9 === 0 ? AssetStatus.IN_PLAN : i % 8 === 0 ? AssetStatus.SERVICE : i % 4 === 0 ? AssetStatus.OUT_GOING : AssetStatus.READY;
    const area = status === AssetStatus.READY ? "FREE ZONE" : areas[i % areas.length];

    // Some specifically near expiration
    const nearExpVisual = i % 7 === 0 ? "2026-06-12" : i % 11 === 0 ? "2026-05-30" : "2027-04-18";
    const nearExpMpi = i % 7 === 0 ? "2026-06-12" : i % 11 === 0 ? "2026-05-30" : "2027-04-18";

    assets.push({
      ccuNumber: `RNG-${type.slice(0, 3).toUpperCase()}-${dept}-${i}`,
      type,
      owner: dept,
      area,
      status,
      visualExpiraDate: nearExpVisual,
      mpiExpiraDate: nearExpMpi,
      remark: status === AssetStatus.SERVICE ? "MPI certification overdue" : undefined,
      lengthCm: 200 + (i % 50),
      widthCm: 150 + (i % 30),
      heightCm: 160 + (i % 40),
      tareWeightKg: 1000 + (i % 200),
      payloadKg: 4000 + (i % 1000),
      grossWeightKg: 5000 + (i % 1200)
    });
  }

  return assets;
}

export function getInitialTransactions(): Transaction[] {
  return [
    {
      id: "TX-0001",
      type: TransactionType.LOAD_OUT,
      date: "2026-06-05T08:30:00Z",
      ccuNumber: "TXP-TTC-AAA-025",
      assetType: AssetType.TOTE_TANK,
      vessel: "HD-38",
      rig: "GHTH",
      segment: "CMT"
    },
    {
      id: "TX-0002",
      type: TransactionType.LOAD_OUT,
      date: "2026-06-06T10:15:00Z",
      ccuNumber: "CHR-PLC-CMT-0021",
      assetType: AssetType.PALLET_CARRIER,
      vessel: "HD-29",
      rig: "SKL",
      segment: "CMT"
    },
    {
      id: "TX-0003",
      type: TransactionType.BACK_LOAD,
      date: "2026-06-08T14:20:00Z",
      ccuNumber: "TXP-TTC-AAA-001",
      assetType: AssetType.TOTE_TANK,
      vessel: "HD-68",
      rig: "GHTH",
      segment: "CMT",
      remark: "Slight scratches on surface. Cleaned and certified."
    },
    {
      id: "TX-0004",
      type: TransactionType.LOAD_OUT,
      date: "2026-06-09T07:45:00Z",
      ccuNumber: "BSO-BKT-CMT-005",
      assetType: AssetType.BASKET,
      vessel: "HD-38",
      rig: "GHTH",
      segment: "CMT"
    },
    {
      id: "TX-0005",
      type: TransactionType.BACK_LOAD,
      date: "2026-06-09T16:00:00Z",
      ccuNumber: "TXP-TTC-AAA-002",
      assetType: AssetType.TOTE_TANK,
      vessel: "HD-38",
      rig: "GHTH",
      segment: "CMT",
      remark: "Issue Found: Body deformation/dent at the corner" // Sent to service
    }
  ];
}
