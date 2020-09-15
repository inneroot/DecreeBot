import { logger } from './logger'
const xLogger = logger.child({ module: 'x-ray' })
import { Decree } from "../types/Decree"

import Xray = require("x-ray")
const x = Xray({
  filters: {
    trim: function (value) {
      return typeof value === 'string' ? value.trim() : value
    }
  }
})

const requesturl = 'https://mepar.ru/documents/decrees/'


const scrapDecrees = async (limit: number = 1): Promise<Array<Decree>> => {
  let arr = []
  try {
    arr = await x(requesturl, 'a.item-text', [
      {
        title: '|trim',
        url: '@href',
      }
    ])
      .paginate('.page-navigation-selector a:nth-last-child(2)@href')
      .limit(limit)
    xLogger.info(`Scrapped ${arr.length} decrees`)
    return arr.filter(el => el.url != undefined).map(el => ({ ...el, date: getDateFromLink(el.url) }))
  }
  catch (err) {
    xLogger.error(err.message)
    return []
  }
}
let counter = 0
const getDecreeDetails = async (decree: Decree): Promise<Decree> => {
  counter++
  if (counter % 100 == 0) { xLogger.info({ counter: counter }) }
  return x(decree.url,
    {
      number: '.doc-detail-retro-outer .row .text-left',
      text: '.doc-detail-retro-body|trim'
    })
    .then(scr => {
      if (scr.text == undefined) {
        xLogger.debug({ msg: 'Text field undefined', ...decree })
        scr.text = ''
      }
      else {
        scr.text = scr.text.split('\r\n').join(' ').split('\t').join(' ')
      }
      if (scr.number == undefined) {
        xLogger.debug({ msg: 'Number field undefined', ...decree })
        scr.number = 0
      }
      else { scr.number = +scr.number.slice(2) }
      return { ...decree, ...scr }
    })
    .catch(e => xLogger.error({ msg: e.message, decree: decree.url }))
}

function getDateFromLink(url) {
  const dateArr = url.split('/').slice(-5, -2)
  return new Date(dateArr[0], +dateArr[1] - 1, dateArr[2])
}

export { getDecreeDetails, scrapDecrees }
