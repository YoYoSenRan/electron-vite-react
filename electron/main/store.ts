import Store from "electron-store"

interface StoreSchema {
  windowBounds: {
    x?: number
    y?: number
    width: number
    height: number
  }
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: {
      width: 800,
      height: 600,
    },
  },
})

export default store
