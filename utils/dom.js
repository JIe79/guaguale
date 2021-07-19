/**
 * 类似Jquery获取元素
 * @param {String} queryName 
 * @return {Object} 元素
 */
function $(queryName) {
  return wx.createSelectorQuery().select(queryName)
}

/**
 * 从图片url地址获取到图片对象
 * @param {String} url 图片地址
 * @return {Object} Image Object
 */
function getImageByUrl(url) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: url,
      success: res => {
        resolve(res);
      },
      fail: e => {
        reject(e);
      }
    })
  })
}

/**
 * 获取元素的宽高信息
 * @param {String} queryName 查询信息
 * @return {Object} 元素的信息
 */
function getDomRect(queryName) {
  return new Promise(resolve => {
    $(queryName).boundingClientRect(rect=>{
      resolve(rect)
    }).exec()
  })
}

/**
 * 将canvas转成图片
 * @param {String} echart_canvas_id canvas元素的id
 * @return {String} 图片的路径
 */
function canvasToImgByCanvasId(echart_canvas_id) {
  return new Promise((resolve, reject) => {
    setTimeout(()=>{
      this.selectComponent(echart_canvas_id).canvasToTempFilePath({
        success: res => {
          resolve(res.tempFilePath)
        },
        fail: res => { reject(res) }
      });
    },0)
  })
}

/**
 * 获取Canvas的context
 * @param {String} queryName 查询信息
 */
function getCanvas(queryName) {
  return new Promise((resolve, reject) => {
    $(queryName).context((res) => {
      resolve(res.context)
    }).exec()
  })
}

export {
  $,
  getImageByUrl,
  getDomRect,
  canvasToImgByCanvasId,
  getCanvas,
}