import csv from "csv-parser";
import fs from "fs";

const results: AvanzaDataItem[] = [];

const accountMapping = JSON.parse(
  fs.readFileSync(process.cwd() + "/src/account-mapping.json").toString()
);
const isinMapping = JSON.parse(
  fs.readFileSync(process.cwd() + "/src/isin-symbol-mapping.json").toString()
);
interface AvanzaDataItem {
  date: string;
  account: string;
  typeOfTransaction: TypeOfTransaction;
  description: string;
  amount: string;
  pricePer: string;
  cost: string;
  fee: string;
  currency: string;
  ISIN: string;
  result: string;
}

type GhostfolioType = "BUY" | "DIVIDEND" | "ITEM" | "LIABILITY" | "SELL";
export interface GhostfolioItem {
  accountId: string;
  comment: any;
  fee: number;
  quantity: number;
  type: GhostfolioType;
  unitPrice: number;
  currency: string;
  dataSource: string;
  date: string;
  symbol: string;
}

const headers = [
  "date",
  "account",
  "typeOfTransaction",
  "description",
  "amount",
  "pricePer",
  "cost",
  "fee",
  "currency",
  "ISIN",
  "result",
];
let source = "YAHOO";
// const source = "YAHOO";
source = "MANUAL";

type TypeOfTransaction = "Köp" | "Sälj" | "Utdelning" | "Övrigt";

fs.createReadStream("data.csv")
  .pipe(csv({ headers: headers, separator: ";" }))
  .on("data", (data) => results.push(data))
  .on("end", () => {
    results.shift(); // Remove header row
    // console.log(results[0]);
    const transformedItems = results.filter((e) => e.ISIN).map(transformItem);
    saveData(transformedItems);
  });

function saveData(
  data: GhostfolioItem[],
  outputName = "transformed-data.json"
) {
  const obj = {
    meta: {
      date: new Date().toISOString(),
      version: "dev",
    },
    activities: data,
  };
  fs.writeFileSync(`${process.cwd()}/${outputName}`, JSON.stringify(obj));
}

function transformItem(item: AvanzaDataItem): GhostfolioItem {
  if (item.typeOfTransaction === "Övrigt") {
    return {
      date: item.date,
      comment: null,
      fee: 0,
      currency: "USD", // Currency doesn't matter cause it will match up
      symbol: getSymbol(item),
      quantity: Math.abs(transformAvanzaNumberToNumber(item.amount)),
      unitPrice: transformAvanzaNumberToNumber(item.pricePer),
      accountId: accountMapping[item.account],
      dataSource: source,
      type: transformAvanzaNumberToNumber(item.amount) > 0 ? "BUY" : "SELL",
    };
  }
  let obj = {
    date: item.date,
    comment: null,
    fee: transformAvanzaNumberToNumber(item.fee),
    currency: item.currency,
    symbol: getSymbol(item),
    quantity: Math.abs(transformAvanzaNumberToNumber(item.amount)), // Even if it is sale it should be positive
    unitPrice:
      Math.abs(transformAvanzaNumberToNumber(item.cost)) /
      Math.abs(transformAvanzaNumberToNumber(item.amount)), // Even if it is sale it should be positive
    accountId: accountMapping[item.account],
    dataSource: source,
    type: avanzaTypeToGhostfolioType(item.typeOfTransaction),
  };
  if (obj.date === "2023-04-24") console.log(item, obj);
  return obj;
}

function getSymbol(item: AvanzaDataItem) {
  return (
    isinMapping[item.ISIN] || item.description.replace(/ /g, "_").toUpperCase()
  );
}

function transformAvanzaNumberToNumber(s: string): number {
  if (s == "-") return 0;
  s = s.replace(",", ".");
  return Number(s);
}

function avanzaTypeToGhostfolioType(type: TypeOfTransaction): GhostfolioType {
  switch (type) {
    case "Köp":
      return "BUY";
    case "Sälj":
      return "SELL";
    case "Utdelning":
      return "DIVIDEND";
    default:
      throw new Error("Unknown type, " + type);
  }
}
