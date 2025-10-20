/* Core interactive behavior:
 - countdown to tomorrow midnight
 - pre-launch notify (opens whatsapp)
 - after launch: show "Now Available", enable buy/checkout
 - add-to-cart & cart actions saved in localStorage
 - checkout composes message and opens WhatsApp with order summary
*/

/* ---------- CONFIG ---------- */
const WHATSAPP_NUMBER = "917295857885"; // +91 7295857885 without plus sign
const INSTAGRAM_URL = "https://www.instagram.com/wildnnest/";
const STORAGE_KEY = "wildnest_cart_v1";

/* ---------- UTIL ---------- */
function $(s){ return document.querySelector(s) }
function $all(s){ return Array.from(document.querySelectorAll(s)) }
function currency(n){ return Number(n).toLocaleString('en-IN') }

/* ---------- CART LOGIC ---------- */
function loadCart(){
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}
function saveCart(cart){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  renderCartCount()
}
function addToCart(id, name, price){
  const cart = loadCart()
  const existing = cart.find(i => i.id===id)
  if(existing) existing.qty += 1
  else cart.push({id,name,price:Number(price),qty:1})
  saveCart(cart)
  showToast(`${name} added to cart`)
}
function removeFromCart(id){
  let cart = loadCart()
  cart = cart.filter(i=>i.id!==id)
  saveCart(cart)
  renderCartContents()
}
function updateQty(id, qty){
  const cart = loadCart()
  const entry = cart.find(i=>i.id===id)
  if(!entry) return
  entry.qty = qty
  if(entry.qty <= 0) removeFromCart(id)
  saveCart(cart)
  renderCartContents()
}

/* ---------- UI RENDER ---------- */
function renderCartCount(){
  const cart = loadCart()
  const count = cart.reduce((s,i)=>s+i.qty,0)
  $("#cart-count").innerText = count
}
function renderCartContents(){
  const container = $("#cart-contents")
  container.innerHTML = ""
  const cart = loadCart()
  if(cart.length===0){
    container.innerHTML = `<p class="muted">Your cart is empty.</p>`
    $("#cart-total").innerText = "0"
    $("#checkout-btn").disabled = true
    return
  }

  cart.forEach(item=>{
    const row = document.createElement("div")
    row.className = "cart-item"
    row.innerHTML = `
      <img src="${getImageForProduct(item.id)}" alt="${item.name}">
      <div style="flex:1">
        <div style="font-weight:700">${item.name}</div>
        <div class="muted">₹${currency(item.price)} x ${item.qty}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <div style="font-weight:800">₹${currency(item.price*item.qty)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn outline small dec" data-id="${item.id}">-</button>
          <button class="btn outline small inc" data-id="${item.id}">+</button>
        </div>
      </div>
    `
    container.appendChild(row)
  })

  // attach inc/dec listeners
  $all(".inc").forEach(b => b.addEventListener("click", e=>{
    const id = e.currentTarget.dataset.id
    const cart = loadCart()
    const item = cart.find(i=>i.id===id)
    if(item){ updateQty(id, item.qty+1) }
  }))
  $all(".dec").forEach(b => b.addEventListener("click", e=>{
    const id = e.currentTarget.dataset.id
    const cart = loadCart()
    const item = cart.find(i=>i.id===id)
    if(item){ updateQty(id, item.qty-1) }
  }))

  const total = cart.reduce((s,i)=>s + i.price*i.qty, 0)
  $("#cart-total").innerText = currency(total)
  $("#checkout-btn").disabled = false
}

/* returns image path by product id (simple mapping) */
function getImageForProduct(id){
  if(id==="wild-001") return "image-30.png"
  if(id==="wild-002") return "1000158241_edited.jpeg"
  return "image-30.png"
}

/* ---------- Toast helper ---------- */
function showToast(text){
  // simple ephemeral text using alert replacement
  const el = document.createElement("div")
  el.textContent = text
  el.style.position = "fixed"
  el.style.bottom = "22px"
  el.style.left = "50%"
  el.style.transform = "translateX(-50%)"
  el.style.background = "rgba(0,0,0,0.8)"
  el.style.color = "#fff"
  el.style.padding = "10px 16px"
  el.style.borderRadius = "10px"
  el.style.zIndex = 120
  document.body.appendChild(el)
  setTimeout(()=> el.style.opacity = "0", 1800)
  setTimeout(()=> el.remove(), 2300)
}

/* ---------- COUNTDOWN ---------- */
function startCountdown(){
  // tomorrow midnight local time
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(0,0,0,0,0)

  function tick(){
    const now = new Date()
    const diff = tomorrow - now
    if(diff <= 0){
      // launch!
      $("#countdown").classList.add("hidden")
      $(".launch-cta").classList.remove("hidden")
      $(".pre-launch-cta").classList.add("hidden")
      // enable buy buttons
      enableBuyButtons()
      return clearInterval(timer)
    }
    const days = Math.floor(diff / (1000*60*60*24))
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60))
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60))
    const seconds = Math.floor((diff % (1000*60)) / 1000)
    $("#days").innerText = days
    $("#hours").innerText = String(hours).padStart(2,"0")
    $("#minutes").innerText = String(minutes).padStart(2,"0")
    $("#seconds").innerText = String(seconds).padStart(2,"0")
  }
  tick()
  const timer = setInterval(tick, 1000)
}

/* When launch happens, make Add to Cart enabled and show whatsapp order link */
function enableBuyButtons(){
  $all(".add-to-cart").forEach(btn => {
    btn.disabled = false
    btn.classList.remove("outline")
    btn.classList.add("primary")
  })
}

/* ---------- ATTACH EVENTS ---------- */
function attachUI(){
  // Add to cart handlers
  $all(".add-to-cart").forEach(button=>{
    button.addEventListener("click", e=>{
      const card = e.currentTarget.closest(".product-card")
      const id = card.dataset.id
      const name = card.dataset.name
      const price = card.dataset.price
      addToCart(id,name,price)
    })
  })

  // Notify me buttons (open whatsapp with a prefilled message)
  $all(".notify-whatsapp").forEach(b=>{
    b.addEventListener("click", e=>{
      const card = e.currentTarget.closest(".product-card")
      const name = card.dataset.name
      const msg = encodeURIComponent(`Hello WildNest, please notify me when "${name}" is available. Thanks!`)
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank")
    })
  })

  // Header notify
  $("#notify-btn").addEventListener("click", () => {
    const msg = encodeURIComponent("Hello WildNest, please notify me when the product is launched. Thank you!")
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank")
  })

  // Cart open/close
  $("#cart-btn").addEventListener("click", openCart)
  $("#close-cart").addEventListener("click", closeCart)
  $("#clear-cart").addEventListener("click", ()=>{
    localStorage.removeItem(STORAGE_KEY)
    renderCartContents()
    renderCartCount()
  })

  // Checkout: compose message and open WhatsApp
  $("#checkout-btn").addEventListener("click", ()=>{
    const cart = loadCart()
    if(cart.length===0) return showToast("Cart is empty")
    const itemsText = cart.map(i=>`${i.name} x ${i.qty} = ₹${currency(i.price*i.qty)}`).join("%0A")
    const total = cart.reduce((s,i)=>s + i.price*i.qty, 0)
    const msg = encodeURIComponent(`Hello WildNest!%0AI'd like to place an order:%0A${itemsText}%0A%0ATotal: ₹${currency(total)}%0AName:%0AAddress:%0APhone:%0A(Please reply to confirm)`)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank")
  })

  // Cart overlay click
  $("#overlay").addEventListener("click", closeCart)

  // whatsapp-order link in hero (after launch) opens cart summary if items exist, else opens generic chat
  $("#whatsapp-order").addEventListener("click", (e)=>{
    e.preventDefault()
    const cart = loadCart()
    if(cart.length === 0){
      const msg = encodeURIComponent("Hello WildNest! I would like to place an order.")
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank")
    } else {
      $("#checkout-btn").click()
    }
  })
}

/* ---------- CART DRAWER helpers ---------- */
function openCart(){
  $("#cart-drawer").classList.remove("hidden")
  $("#overlay").classList.remove("hidden")
  $("#cart-drawer").setAttribute("aria-hidden","false")
  renderCartContents()
}
function closeCart(){
  $("#cart-drawer").classList.add("hidden")
  $("#overlay").classList.add("hidden")
  $("#cart-drawer").setAttribute("aria-hidden","true")
}

/* ---------- INIT ---------- */
function init(){
  // disable buy until launch
  $all(".add-to-cart").forEach(btn=> { btn.disabled = true })
  renderCartCount()
  startCountdown()
  attachUI()
  // show hero whatsapp link default target
  $("#whatsapp-order").href = `https://wa.me/${WHATSAPP_NUMBER}`
  // ensure logo click leads to instagram (done in HTML)
}
init()
