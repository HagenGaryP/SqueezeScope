export type TickerRow = {
  ticker: string
  price: number
  pctChange: number
  siPublic: number
  siBroad: number
  dtc: number
  rvol: number
  catalyst: boolean
}

export type TickerMetrics = {
  ticker: string
  siPublic: number
  siBroad: number
  dtc: number
  rvol30d: number
  squeezeScore: number
  series: { t: string; price: number; vol: number }[]
}
