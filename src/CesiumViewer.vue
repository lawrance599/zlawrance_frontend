<!--
  CesiumViewer 组件
  功能：封装 Cesium 地图，展示 3D Tiles 模型，点击传感器时触发事件
-->
<template>
    <div class="cesium-viewer">
        <div id="cesiumContainer" ref="cesiumContainer"></div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

// ============== 常量配置 ==============
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlMDA1ZjExOS1iNWUxLTRjNDEtYjk3ZS1mODI5ZTU3OWZmYzIiLCJpZCI6MzY5NDg2LCJpYXQiOjE3NjgwNTkxMjl9.3AKIGEkVaOMWAYtoynSoHV2cemyaTZvY3ixoO0-PmeQ'
const TILESET_ASSET_ID = 4345974
const IMAGERY_ASSET_ID = 3954

// 支持的传感器编码前缀
const SENSOR_CODE_PREFIXES = ['IP', 'EX', 'TC']

// ============== Props 定义 ==============
const props = defineProps({
    // 基础配置
    timeline: { type: Boolean, default: false },
    animation: { type: Boolean, default: false },
    baseLayerPicker: { type: Boolean, default: true },
    sceneModePicker: { type: Boolean, default: true },
    fullscreenButton: { type: Boolean, default: true },
    vrButton: { type: Boolean, default: false },
    geocoder: { type: Boolean, default: true },
    homeButton: { type: Boolean, default: true },
    infoBox: { type: Boolean, default: false },
    selectionIndicator: { type: Boolean, default: true },
    navigationHelpButton: { type: Boolean, default: true },
    navigationInstructionsInitiallyVisible: { type: Boolean, default: false },

    // 扩展配置
    enableLighting: { type: Boolean, default: true },
    depthTestAgainstTerrain: { type: Boolean, default: true }
})

// ============== 事件定义 ==============
const emit = defineEmits(['clickSensor', 'viewerReady'])

// ============== Refs ==============
const cesiumContainer = ref(null)

// ============== Cesium 实例 ==============
let viewer = null
let clickHandler = null

// ============== 工具函数 ==============

/**
 * 从位置信息中提取经纬度高度
 */
function extractPositionProperties(position) {
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    return {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
    }
}

/**
 * 检查编码是否为支持的传感器类型
 */
function isSensorCode(code) {
    return SENSOR_CODE_PREFIXES.some(prefix => code.startsWith(prefix))
}

/**
 * 从名称中提取传感器编码
 */
function extractSensorCode(name) {
    if (!name || !name.includes(':')) return null

    const code = name.split(':')[1]
    return isSensorCode(code) ? code : null
}

// ============== Cesium 初始化 ==============

/**
 * 创建并配置 Cesium Viewer
 */
function createViewer(containerId) {
    return new Cesium.Viewer(containerId, {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: IMAGERY_ASSET_ID }),
        // 始终启用timeline和animation，通过CSS控制可见性
        timeline: true,
        animation: true,
        baseLayerPicker: props.baseLayerPicker,
        sceneModePicker: props.sceneModePicker,
        fullscreenButton: props.fullscreenButton,
        vrButton: props.vrButton,
        geocoder: props.geocoder,
        homeButton: props.homeButton,
        infoBox: props.infoBox,
        selectionIndicator: props.selectionIndicator,
        navigationHelpButton: props.navigationHelpButton,
        navigationInstructionsInitiallyVisible: props.navigationInstructionsInitiallyVisible
    })
}

/**
 * 加载并配置 3D Tiles 模型
 */
async function loadTileset(viewerInstance) {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(TILESET_ASSET_ID)
    viewerInstance.scene.primitives.add(tileset)

    // 等待模型加载完成并缩放到视图
    await tileset.readyPromise
    await viewerInstance.zoomTo(tileset)

    // 应用默认样式
    const extras = tileset.asset.extras
    if (Cesium.defined(extras)?.ion?.defaultStyle) {
        tileset.style = new Cesium.Cesium3DTileStyle(extras.ion.defaultStyle)
    }

    return tileset
}

/**
 * 配置场景环境
 */
function configureScene(viewerInstance) {
    viewerInstance.scene.globe.depthTestAgainstTerrain = props.depthTestAgainstTerrain
    viewerInstance.scene.globe.enableLighting = props.enableLighting
    viewerInstance.scene.terrainShadows = Cesium.ShadowMode.ENABLED
}

// ============== 点击事件处理 ==============

/**
 * 处理 Entity 点击
 */
function handleEntityClick(pickedEntity) {
    const entity = pickedEntity.id
    const properties = {}

    // 提取实体属性
    if (entity.name) properties.name = entity.name
    if (entity.properties) {
        entity.properties.propertyNames.forEach(name => {
            properties[name] = entity.properties[name]?.getValue()
        })
    }

    // 提取位置信息
    if (entity.position) {
        const position = entity.position.getValue(viewer.clock.currentTime)
        if (position) {
            Object.assign(properties, extractPositionProperties(position))
        }
    }

    return properties
}

/**
 * 处理 3D Tiles Feature 点击
 */
function handleFeatureClick(pickedFeature, clickPosition) {
    const properties = {}

    // 提取位置信息
    const cartesian = viewer.scene.pickPosition(clickPosition)
    if (Cesium.defined(cartesian)) {
        Object.assign(properties, extractPositionProperties(cartesian))
    }

    // 提取 Feature 属性
    if (pickedFeature.getPropertyIds) {
        pickedFeature.getPropertyIds().forEach(id => {
            properties[id] = pickedFeature.getProperty(id)
        })
    }

    // 检查是否为传感器并触发事件
    const name = properties['name_1']
    const sensorCode = extractSensorCode(name)
    if (sensorCode) {
        // 对传感器编号进行后处理: EX1 -> EX1-1, IP系列保持不变
        let type_ = sensorCode.substring(0, 2)
        if (type_ === 'EX') type_ = 'EX1-'
        let idx = sensorCode.substring(2, sensorCode.length)
        console.log(`${type_}${idx}`);

        emit('clickSensor', `${type_}${idx}`)
    }
}

/**
 * 处理鼠标左键点击
 */
function handleLeftClick(click) {
    const pickedEntity = viewer.scene.pick(click.position)

    // 首先尝试获取 Entity
    if (Cesium.defined(pickedEntity)?.id) {
        handleEntityClick(pickedEntity)
        return
    }

    // 否则尝试获取 3D Tiles Feature
    const pickedFeature = viewer.scene.pick(click.position)
    if (Cesium.defined(pickedFeature)) {
        handleFeatureClick(pickedFeature, click.position)
    }
}

/**
 * 设置点击事件监听
 */
function setupClickHandler() {
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    clickHandler.setInputAction(
        handleLeftClick,
        Cesium.ScreenSpaceEventType.LEFT_CLICK
    )
}

// ============== 暴露的方法 ==============

/**
 * 获取 Cesium Viewer 实例
 */
function getViewer() {
    return viewer
}

/**
 * 缩放到指定目标
 */
function zoomTo(target) {
    if (viewer) {
        viewer.zoomTo(target)
    }
}

/**
 * 飞向指定位置
 */
function flyTo(position, options = {}) {
    if (viewer) {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                position.longitude,
                position.latitude,
                position.height || 1000
            ),
            duration: options.duration || 2,
            ...options
        })
    }
}

/**
 * 显示/隐藏时间轴
 */
function setTimelineVisible(visible) {
    if (viewer) {
        viewer.timeline.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏动画控件
 */
function setAnimationVisible(visible) {
    if (viewer) {
        viewer.animation.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏搜索栏
 */
function setGeocoderVisible(visible) {
    if (viewer) {
        viewer.geocoder.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏 Home 按钮
 */
function setHomeButtonVisible(visible) {
    if (viewer) {
        viewer.homeButton.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏全屏按钮
 */
function setFullscreenButtonVisible(visible) {
    if (viewer) {
        viewer.fullscreenButton.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏场景模式选择器
 */
function setSceneModePickerVisible(visible) {
    if (viewer) {
        viewer.sceneModePicker.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 显示/隐藏图层选择器
 */
function setBaseLayerPickerVisible(visible) {
    if (viewer) {
        viewer.baseLayerPicker.container.style.display = visible ? 'block' : 'none'
    }
}

/**
 * 启用/禁用光照效果
 */
function setEnableLighting(enabled) {
    if (viewer) {
        viewer.scene.globe.enableLighting = enabled
    }
}

/**
 * 启用/禁用深度测试
 */
function setDepthTestAgainstTerrain(enabled) {
    if (viewer) {
        viewer.scene.globe.depthTestAgainstTerrain = enabled
    }
}

// 暴露方法给父组件
defineExpose({
    getViewer,
    zoomTo,
    flyTo,
    setTimelineVisible,
    setAnimationVisible,
    setGeocoderVisible,
    setHomeButtonVisible,
    setFullscreenButtonVisible,
    setSceneModePickerVisible,
    setBaseLayerPickerVisible,
    setEnableLighting,
    setDepthTestAgainstTerrain
})

// ============== 监听 Props 变化 ==============

// 监听 timeline 变化
watch(() => props.timeline, (newVal) => {
    if (viewer?.timeline?.container) {
        viewer.timeline.container.style.display = newVal ? 'block' : 'none'
    }
})

// 监听 animation 变化
watch(() => props.animation, (newVal) => {
    if (viewer?.animation?.container) {
        viewer.animation.container.style.display = newVal ? 'block' : 'none'
    }
})

// 监听 enableLighting 变化
watch(() => props.enableLighting, (newVal) => {
    if (viewer) {
        viewer.scene.globe.enableLighting = newVal
        viewer.scene.terrainShadows = newVal ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED
    }
})

// 监听 depthTestAgainstTerrain 变化
watch(() => props.depthTestAgainstTerrain, (newVal) => {
    if (viewer) {
        viewer.scene.globe.depthTestAgainstTerrain = newVal
    }
})

// ============== 生命周期 ==============

onMounted(async () => {
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN
    Cesium.buildModuleUrl.setBaseUrl('/Cesium-1.135/Build/Cesium/')

    // 初始化 Viewer
    viewer = createViewer('cesiumContainer')

    // 配置场景
    configureScene(viewer)

    // 根据props初始值设置timeline和animation的显示状态
    if (viewer.timeline?.container) {
        viewer.timeline.container.style.display = props.timeline ? 'block' : 'none'
    }
    if (viewer.animation?.container) {
        viewer.animation.container.style.display = props.animation ? 'block' : 'none'
    }

    // 加载 3D 模型
    try {
        await loadTileset(viewer)
    } catch (error) {
        console.error('加载 3D Tiles 失败:', error)
    }

    // 设置点击事件
    setupClickHandler()

    // 发送 viewerReady 事件
    emit('viewerReady', viewer)
})

onUnmounted(() => {
    // 清理资源
    if (clickHandler) {
        clickHandler.destroy()
        clickHandler = null
    }
    if (viewer) {
        viewer.destroy()
        viewer = null
    }
})
</script>

<style scoped>
.cesium-viewer {
    width: 100%;
    height: 100%;
    position: relative;
}

#cesiumContainer {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
}
</style>
