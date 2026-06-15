/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AssetType {
  PALLET_CARRIER = "Pallet Carrier",
  TOTE_TANK = "Tote Tank",
  BASKET = "Basket",
  CONTAINER = "Container",
  SKID = "Skid",
  TOOL_BOX = "Tool Box"
}

export enum AssetStatus {
  READY = "Ready to use in warehouse",
  IN_PLAN = "In Plan (Booking)",
  SERVICE = "Service (IN)",
  OUT_GOING = "Out Going",
  UNDERGOING_BACKLOAD = "Undergoing Backload"
}

export interface Asset {
  ccuNumber: string; // S/N
  type: AssetType;
  owner: string; // CMT, WL, Testing, Slickline, etc.
  area: string; // FREE ZONE, GHTH, HIB, COSL GIFT, etc.
  status: AssetStatus;
  visualExpiraDate: string; // Date string
  mpiExpiraDate: string; // Date string
  remark?: string; // Remark field (e.g., damage descriptions)
  chemicals?: string; // Chemical details if applicable
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  tareWeightKg?: number;
  payloadKg?: number;
  grossWeightKg?: number;
  
  // Lifting gear and load test certification parameters
  ltUnit?: string;
  ltSling?: string;
  slingId?: string;
  ltShackle?: string;
  shackleId?: string;
}

export enum TransactionType {
  LOAD_OUT = "Load Out",
  BACK_LOAD = "Back Load"
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  ccuNumber: string;
  assetType: AssetType;
  vessel: string;
  rig: string;
  segment: string;
  remark?: string; // Specific damage remark for back load if status is Service (IN)
}

export interface ChecklistCcuCol {
  ccuNumber: string;
  qrCode: "Yes" | "No" | "";
  // Certificate and Lifting serial number
  loadTest: boolean;
  visualInspection3rd: boolean;
  ndt: boolean;
  // Lifting Gear Detail
  slingNo: string;
  shackle1No: string;
  shackle2No: string;
  shackle3No: string;
  shackle4No: string;

  // Minor Service Work (Yes / No / "")
  ccuNamePassed: "Yes" | "No" | "";
  dimensionPassed: "Yes" | "No" | "";
  weightPassed: "Yes" | "No" | "";
  conditionSlingPassed: "Yes" | "No" | "";
  colorCodePassed: "Yes" | "No" | "";
  lightPaintingPassed: "Yes" | "No" | "";
  colorCoatingsEdgesPassed: "Yes" | "No" | "";
  namePlatePassed: "Yes" | "No" | "";
  tagLinePassed: "Yes" | "No" | "";
  cleaningPassed: "Yes" | "No" | "";

  // Major Repair Service (Yes / No / "")
  lockingDevicePassed: "Yes" | "No" | "";
  rackSupportPassed: "Yes" | "No" | "";
  structuralRepairPassed: "Yes" | "No" | "";
  fullBodyPaintingPassed: "Yes" | "No" | "";
  replaceSlingPassed: "Yes" | "No" | "";
  legSupportPassed: "Yes" | "No" | "";

  remark?: string;
}

export interface BackloadChecksheet {
  id: string;
  date: string;
  workOrderId: string;
  qaqcInspector: string;
  ccus: ChecklistCcuCol[]; // Array of exactly up to 5 CCUs
}

