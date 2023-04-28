import csv from "csv-parser"
import fs from "fs"


const results : AvanzaDataItem[] = [];

const accountMapping = JSON.parse(fs.readFileSync(process.cwd() + '/src/account-mapping.json').toString());

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


export interface GhostfolioItem{
  accountId: string
  comment: any
  fee: number
  quantity: number
  type: string
  unitPrice: number
  currency: string
  dataSource: string
  date: string
  symbol: string
}



const headers = [
  "date", "account", "typeOfTransaction", "description", "amount", "pricePer", "cost", "fee", "currency", "ISIN", "result"
]
type TypeOfTransaction = "Köp" | "Sälj" | "Utdelning";

fs.createReadStream('data.csv')
  .pipe(csv({headers:headers, separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    results.shift(); // Remove header row
    // console.log(results[0]);
    const transformedItems= results.filter(e => e.ISIN).map(transformItem);
  saveData(transformedItems);

  });


function saveData(data: GhostfolioItem[], outputName =  "transformed-data.json"){
  const obj = {
    "meta": {
      "date": "2023-02-05T00:00:00.000Z",
      "version": "dev"
    },
    activities: data
  }
  fs.writeFileSync(`${process.cwd()}/${outputName}`, JSON.stringify(obj));
}

function transformItem(item: AvanzaDataItem): GhostfolioItem{
  return {
    date: item.date,
    comment: null,
    fee: transformAvanzaNumberToNumber(item.fee),
    currency: item.currency,
    symbol: item.ISIN,
    quantity: transformAvanzaNumberToNumber(item.amount),
    unitPrice: transformAvanzaNumberToNumber(item.pricePer),
    accountId: accountMapping[item.account],
    dataSource: "YAHOO",
    type: avanaTypeToGhostfolioType(item.typeOfTransaction)
    
  }


}

function transformAvanzaNumberToNumber(s: string) : number{
  if(s == "-") return 0;
  s = s.replace(",", ".");
  return Math.round(Number(s));
}

function avanaTypeToGhostfolioType(type: TypeOfTransaction){
  const mapping = {
    "Köp": "BUY",
    "Sälj": "SELL",
    "Utdelning": "DIVIDEND"
  };
  return mapping[type];
}


