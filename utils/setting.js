/**
 *  打开设置页
 * @param {String} permission 
 */
export function openSetting(permission) {
  return new Promise(resolve => {
    wx.openSetting({
      success: res => {
        resolve(res.authSetting[permission])
      }
    })
  })
}

/**
 * 获取目前请求过的权限
 * @param {String} permission 
 */
export function getSetting(permission) {
  return new Promise(resolve => {
    wx.getSetting({
      success: res => {
        resolve(res.authSetting[permission])
      }
    })
  })
}