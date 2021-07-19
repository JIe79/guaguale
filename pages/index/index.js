const app = getApp()

let { Router } = app.require('./utils/common')
let { 
  getImageByUrl,
  getDomRect,
  getCanvas
} = app.require('./utils/dom')

Router({
  data:{
    visible_award: true,
    canvasList: {},
    defaultCanvasName: 'awardCanvas',
    awardList: [
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g1.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award1.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g2.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award2.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g3.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award3.jpg',
      },
      {
        cover: 'http://39.108.119.140:8096/hanwen/images/g4.jpg',
        path: 'http://39.108.119.140:8096/hanwen/images/award4.jpg',
      },
    ],
  },

  onReady(){
    this.initAwardCanvas()
  },

  async initAwardCanvas() {
    const { awardList, canvasList } = this.data 
    for (const key in awardList) {
      await this.createCanvas(key, awardList[key])
    }
    this.setData({
      visible_award: false,
      canvasList,
    })
  },

  async createCanvas(index, item) {
    let { canvasList, defaultCanvasName } = this.data,
        canvasIdName = defaultCanvasName + index,
        { width, height } = await getDomRect('#'+canvasIdName),
        ctx = await getCanvas('#'+canvasIdName),
        img = await getImageByUrl(item.cover)

    ctx.drawImage(img.path, 0, 0, width, height)
    ctx.draw(true)
    canvasList[canvasIdName] = ctx
  },

  touchMove(e){
    const { canvasList } = this.data
    const { canvas_name } = this.$data(e)
    const { x, y } = e.changedTouches[0]
    canvasList[canvas_name].clearRect(x, y, 15, 15)
    canvasList[canvas_name].draw(true)
  }
})