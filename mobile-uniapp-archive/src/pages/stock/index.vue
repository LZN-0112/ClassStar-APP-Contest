<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppInput from '@/components/AppInput.vue'
import { secureStorage } from '@/common/storage/secure'

interface Stock {
  code: string
  name: string
  price: number
  prevClose: number
}

interface Holding {
  code: string
  name: string
  quantity: number
  avgPrice: number
}

interface Portfolio {
  cash: number
  holdings: Holding[]
}

const PORTFOLIO_KEY = 'stockPortfolio'
const INITIAL_CASH = 100000

const stockList = ref<Stock[]>([
  { code: '000001', name: '平安银行', price: 12.58, prevClose: 12.45 },
  { code: '000002', name: '万科A', price: 18.32, prevClose: 18.6 },
  { code: '600000', name: '浦发银行', price: 9.85, prevClose: 9.72 },
  { code: '600519', name: '贵州茅台', price: 1688.0, prevClose: 1695.5 },
  { code: '300750', name: '宁德时代', price: 210.5, prevClose: 205.0 },
  { code: '002594', name: '比亚迪', price: 268.8, prevClose: 265.2 },
])

const portfolio = ref<Portfolio>({ cash: INITIAL_CASH, holdings: [] })
const selectedCode = ref<string>('')
const quantity = ref<string>('100')
const timer = ref<number | null>(null)

const selectedStock = computed<Stock | undefined>(() =>
  stockList.value.find((s) => s.code === selectedCode.value),
)

const totalAsset = computed(() => {
  const holdingsValue = portfolio.value.holdings.reduce((sum, h) => {
    const stock = stockList.value.find((s) => s.code === h.code)
    return sum + h.quantity * (stock?.price ?? 0)
  }, 0)
  return portfolio.value.cash + holdingsValue
})

const totalCost = computed(() => {
  return portfolio.value.holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0)
})

const totalProfit = computed(() => {
  const holdingsValue = portfolio.value.holdings.reduce((sum, h) => {
    const stock = stockList.value.find((s) => s.code === h.code)
    return sum + h.quantity * (stock?.price ?? 0)
  }, 0)
  return holdingsValue - totalCost.value
})

const tradeAmount = computed(() => {
  const qty = parseInt(quantity.value, 10)
  if (Number.isNaN(qty) || qty <= 0 || !selectedStock.value) return 0
  return qty * selectedStock.value.price
})

function loadPortfolio() {
  const stored = secureStorage.get<Portfolio>(PORTFOLIO_KEY)
  if (stored && typeof stored.cash === 'number' && Array.isArray(stored.holdings)) {
    portfolio.value = stored
  }
}

function savePortfolio() {
  secureStorage.set(PORTFOLIO_KEY, portfolio.value)
}

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`
}

function formatPrice(value: number) {
  return value.toFixed(2)
}

function getChange(stock: Stock) {
  return stock.price - stock.prevClose
}

function getChangePercent(stock: Stock) {
  if (stock.prevClose === 0) return 0
  return ((stock.price - stock.prevClose) / stock.prevClose) * 100
}

function getChangeColor(stock: Stock) {
  const change = getChange(stock)
  if (change > 0) return '#EF4444'
  if (change < 0) return '#22C55E'
  return 'var(--text-muted)'
}

function selectStock(code: string) {
  selectedCode.value = code
}

function refreshQuotes() {
  stockList.value = stockList.value.map((stock) => {
    const volatility = 0.02
    const change = (Math.random() - 0.5) * 2 * volatility
    const newPrice = Math.max(0.01, stock.price * (1 + change))
    return { ...stock, price: newPrice }
  })
}

function validateTrade(): { qty: number; stock: Stock } | null {
  const qty = parseInt(quantity.value, 10)
  if (Number.isNaN(qty) || qty <= 0) {
    uni.showToast({ title: '请输入有效数量', icon: 'none' })
    return null
  }
  if (!selectedStock.value) {
    uni.showToast({ title: '请选择股票', icon: 'none' })
    return null
  }
  return { qty, stock: selectedStock.value }
}

function onBuy() {
  const result = validateTrade()
  if (!result) return
  const { qty, stock } = result
  const amount = qty * stock.price
  if (amount > portfolio.value.cash) {
    uni.showToast({ title: '资金不足', icon: 'none' })
    return
  }

  const holding = portfolio.value.holdings.find((h) => h.code === stock.code)
  if (holding) {
    const totalQuantity = holding.quantity + qty
    holding.avgPrice = (holding.quantity * holding.avgPrice + amount) / totalQuantity
    holding.quantity = totalQuantity
  } else {
    portfolio.value.holdings.push({
      code: stock.code,
      name: stock.name,
      quantity: qty,
      avgPrice: stock.price,
    })
  }

  portfolio.value.cash -= amount
  savePortfolio()
  uni.showToast({ title: '买入成功', icon: 'success' })
}

function onSell() {
  const result = validateTrade()
  if (!result) return
  const { qty, stock } = result
  const holding = portfolio.value.holdings.find((h) => h.code === stock.code)
  if (!holding || holding.quantity < qty) {
    uni.showToast({ title: '持仓不足', icon: 'none' })
    return
  }

  const amount = qty * stock.price
  holding.quantity -= qty
  if (holding.quantity === 0) {
    portfolio.value.holdings = portfolio.value.holdings.filter((h) => h.code !== stock.code)
  }

  portfolio.value.cash += amount
  savePortfolio()
  uni.showToast({ title: '卖出成功', icon: 'success' })
}

function onReset() {
  uni.showModal({
    title: '重置账户',
    content: '确定要重置投资组合吗？',
    success: (res) => {
      if (res.confirm) {
        portfolio.value = { cash: INITIAL_CASH, holdings: [] }
        savePortfolio()
        uni.showToast({ title: '重置成功', icon: 'success' })
      }
    },
  })
}

onMounted(() => {
  loadPortfolio()
  timer.value = setInterval(refreshQuotes, 5000) as unknown as number
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value as unknown as number)
    timer.value = null
  }
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">股票投资模拟</text>
      <view class="action" @click="onReset">
        <AppIcon icon="lucide:rotate-ccw" size="40rpx" color="var(--text-muted)" />
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="summary-card">
        <view class="summary-item">
          <text class="summary-label">总资产</text>
          <text class="summary-value">{{ formatMoney(totalAsset) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">可用现金</text>
          <text class="summary-value">{{ formatMoney(portfolio.cash) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">持仓盈亏</text>
          <text class="summary-value" :style="{ color: totalProfit >= 0 ? '#EF4444' : '#22C55E' }">
            {{ totalProfit >= 0 ? '+' : '' }}{{ formatMoney(totalProfit) }}
          </text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <text class="section-title">股票行情</text>
          <text class="section-tip">每5秒自动刷新</text>
        </view>

        <view class="stock-header">
          <text class="stock-col code">代码</text>
          <text class="stock-col name">名称</text>
          <text class="stock-col price">最新价</text>
          <text class="stock-col change">涨跌幅</text>
        </view>

        <view
          v-for="stock in stockList"
          :key="stock.code"
          class="stock-row"
          :class="{ active: selectedCode === stock.code }"
          @click="selectStock(stock.code)"
        >
          <text class="stock-col code">{{ stock.code }}</text>
          <text class="stock-col name">{{ stock.name }}</text>
          <text class="stock-col price" :style="{ color: getChangeColor(stock) }">
            {{ formatPrice(stock.price) }}
          </text>
          <text class="stock-col change" :style="{ color: getChangeColor(stock) }">
            {{ getChangePercent(stock) >= 0 ? '+' : '' }}{{ getChangePercent(stock).toFixed(2) }}%
          </text>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">模拟交易</text>

        <view v-if="selectedStock" class="trade-info">
          <text class="trade-stock">{{ selectedStock.name }}（{{ selectedStock.code }}）</text>
          <text class="trade-price">
            当前价：{{ formatPrice(selectedStock.price) }} · 预计金额：{{ formatMoney(tradeAmount) }}
          </text>
        </view>
        <view v-else class="trade-info">
          <text class="trade-placeholder">请选择上方股票进行交易</text>
        </view>

        <view class="form-item">
          <text class="label">交易数量</text>
          <AppInput v-model="quantity" type="number" placeholder="请输入交易数量" />
        </view>

        <view class="trade-actions">
          <view class="trade-btn buy" @click="onBuy">
            <text>买入</text>
          </view>
          <view class="trade-btn sell" @click="onSell">
            <text>卖出</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">我的持仓</text>

        <view v-if="portfolio.holdings.length === 0" class="holdings-empty">
          <text class="holdings-empty-text">暂无持仓</text>
        </view>

        <view
          v-for="holding in portfolio.holdings"
          :key="holding.code"
          class="holding-row"
        >
          <view class="holding-main">
            <text class="holding-name">{{ holding.name }}</text>
            <text class="holding-code">{{ holding.code }}</text>
          </view>
          <view class="holding-detail">
            <text class="holding-detail-text">{{ holding.quantity }} 股</text>
            <text class="holding-detail-text">成本 {{ formatPrice(holding.avgPrice) }}</text>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg);
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: var(--surface);
}

.back,
.action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.summary-card {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 32rpx 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-label {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.summary-value {
  font-size: var(--text-size-body);
  font-weight: 700;
  color: var(--text-primary);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.section-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.section-tip {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.stock-header,
.stock-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 0;
}

.stock-header {
  border-bottom: 2rpx solid var(--border-subtle);
}

.stock-row {
  border-bottom: 2rpx solid var(--border-subtle);
}

.stock-row:last-child {
  border-bottom: none;
}

.stock-row.active {
  background-color: rgba(0, 98, 255, 0.06);
  border-radius: var(--rounded-md);
}

.stock-col {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
  text-align: center;
}

.stock-header .stock-col {
  font-weight: 600;
  color: var(--text-muted);
}

.stock-col.code {
  width: 20%;
}

.stock-col.name {
  width: 25%;
}

.stock-col.price {
  width: 27.5%;
}

.stock-col.change {
  width: 27.5%;
}

.trade-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 16rpx;
  border-radius: var(--rounded-md);
  background-color: var(--bg);
}

.trade-stock {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.trade-price {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.trade-placeholder {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.label {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.trade-actions {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
}

.trade-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  border-radius: var(--rounded-lg);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.trade-btn text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: #ffffff;
}

.trade-btn.buy {
  background-color: #EF4444;
}

.trade-btn.sell {
  background-color: #22C55E;
}

.holdings-empty {
  padding: 48rpx 0;
  text-align: center;
}

.holdings-empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.holding-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid var(--border-subtle);
}

.holding-row:last-child {
  border-bottom: none;
}

.holding-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.holding-name {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.holding-code {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.holding-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.holding-detail-text {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.safe-bottom {
  height: 48rpx;
}
</style>
