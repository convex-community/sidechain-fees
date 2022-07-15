import {Address, BigDecimal, BigInt, Bytes} from "@graphprotocol/graph-ts"
import {
  AssetBridged
} from "../generated/Bridger/Bridger"
import { BridgedFeesRecord } from "../generated/schema"
import {ERC20} from "../generated/Bridger/ERC20";

const WEEK = BigInt.fromI32(60 * 60 * 24 * 7)

function getIntervalFromTimestamp(timestamp: BigInt, interval: BigInt): BigInt {
  return timestamp.div(interval).times(interval)
}

function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

function getBridgedFeesRecord(token: Address, timestamp: BigInt, tx: Bytes): BridgedFeesRecord {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const recordId = token.toHexString() + '-' + tx.toHexString()
  let record = BridgedFeesRecord.load(recordId)
  if (!record) {
    record = new BridgedFeesRecord(recordId)
    record.token = token
    record.timestamp = timestamp
    record.week = week
    record.value = BigDecimal.zero()
    record.amount = BigInt.zero()
    record.tx = tx
    record.save()
  }
  return record
}

export function handleAssetBridged(event: AssetBridged): void {
  const token = event.params.token

  const record = getBridgedFeesRecord(token, event.block.timestamp, event.transaction.hash)
  record.amount = record.amount.plus(event.params.amount)
  const tokenContract = ERC20.bind(token)
  const decimalsResult = tokenContract.try_decimals()
  const decimals = decimalsResult.reverted ? 18 : decimalsResult.value
  record.value = record.value.plus(event.params.amount.toBigDecimal().div(exponentToBigDecimal(decimals)))
  record.save()
}
