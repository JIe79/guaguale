import { $tips, $showLoading, $hideLoading, $alert } from './common'
import { openSetting, getSetting } from './setting'

function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: ({ longitude: lon, latitude: lat }) => {
        resolve({ lon, lat })
      },
      fail: err => {
        $tips('請在手機系統設置裡開啟定位', 2000)
        reject(err)
      }
    })
  })
}

/**
 * 获取经纬度
 */
export async function getLocationWithSetting() {
  // 先查看是否有此权限
  let res = await getSetting('scope.userLocation')
  // 如果有权限，或者第一次请求此权限，则正常获取定位信息
  if (res || typeof res === 'undefined') {
    $showLoading('定位中')
    const local = await getLocation()
    $hideLoading()
    return local
  } else {
    // 如果之前请求此权限被拒绝过，则打开设置页
    await $alert('去設置裡打開定位開關')
    let pass = await openSetting('scope.userLocation')
    if (pass) {
      $showLoading('定位中')
      // 根据设置页的结果，再次获取定位信息
      const local = await getLocation()
      $hideLoading()
      return local
    } else {
      $tips('为了不影响您的使用，请授权定位', 2000)
    }
  }

}