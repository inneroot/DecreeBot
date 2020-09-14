import { logger } from './logger'
const xLogger = logger.child({ module: 'x-ray' })

import Xray from 'x-ray'
const x = Xray({
  filters: {
    trim: function (value) {
      return typeof value === 'string' ? value.trim() : value
    }
  }
})

const requesturl = 'https://mepar.ru/documents/decrees/'

x(requesturl, 'a.item-text', [
  {
    title: '|trim',
    link: '@href',
  }
])
  .paginate('.page-navigation-selector a:nth-last-child(2)@href')
  .limit(3)
  .then(function (arr) {
    const newArr = arr.map(el => {
      return {
        ...el,
        date: getDateFromLink(el.link)
      }
    })
    xLogger.debug(newArr)
  })
  .catch(function (err) {
    xLogger.error(err)
  })

function getDateFromLink(url) {
  const dateArr = url.split('/').slice(-5, -2)
  return new Date(dateArr[0], +dateArr[1] - 1, dateArr[2])
}