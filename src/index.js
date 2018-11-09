import "@babel/polyfill"; // 이 라인을 지우지 말아주세요!
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_URL
});

// 로그인 시 유지시키는 코드
api.interceptors.request.use(function(config) {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = "Bearer " + token;
  }
  return config;
});

const headerEl = document.querySelector(".header");
const rootEl = document.querySelector(".root");
let cartLists;
const templates = {
  titleForm: document.querySelector("#title-form").content,
  loginForm: document.querySelector("#login-form").content,
  productListForm: document.querySelector("#product-list-form").content,
  productForm: document.querySelector("#product-form").content,
  registerForm: document.querySelector("#user-register-form").content,
  registerSuccessForm: document.querySelector("#register-success-form").content,
  myPageForm: document.querySelector("#my-page-form").content,
  productDetail: document.querySelector("#product-detail").content,
  productOptionForm: document.querySelector("#product-option-form").content,
  cartForm: document.querySelector("#cart-form").content,
  cartItem: document.querySelector("#cart-item").content,
  orderedForm: document.querySelector("#ordered-form").content,
  orderedFormItem: document.querySelector("#ordered-form-item").content,
  orderedItemDetail: document.querySelector("#ordered-item-detail").content
};

function drawTitleForm() {
  const fragment = document.importNode(templates.titleForm, true);
  const titleFormEl = fragment.querySelector(".title-form");
  titleFormEl.addEventListener("click", e => {
    drawScreen(null);
  });
  headerEl.textContent = "";
  headerEl.appendChild(titleFormEl);
}
// 로그인 폼 그리기
async function drawLoginForm() {
  const fragment = document.importNode(templates.loginForm, true);
  const loginFormEl = fragment.querySelector(".login-form");
  const registerButtonEl = fragment.querySelector(".register-button");

  registerButtonEl.addEventListener("click", e => {
    e.preventDefault();
    drawRegisterForm();
  });
  loginFormEl.addEventListener("submit", async e => {
    e.preventDefault();
    const username = e.target.elements.username.value;
    const password = e.target.elements.password.value;
    const res = await api.post("/users/login", {
      username,
      password
    });
    console.log("로그인 token : " + res.data.token);
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("loginUser", username);
    drawScreen(null);
  });

  // 문서 삽입
  headerEl.appendChild(fragment);
}

// 메인 화면에 카테고리별로 상품 리스트 그리기
async function drawProductList(productData) {
  const fragment = document.importNode(templates.productListForm, true);
  // const fragment2 = document.importNode(templates.productForm, true);
  const productListEl = fragment.querySelector(".product-list");
  const categoryLists = fragment.querySelectorAll("li");
  const scarfEl = fragment.querySelector(".scarf");
  const pantsEl = fragment.querySelector(".pants");
  const shirtsEl = fragment.querySelector(".shirts");
  const knitwearEl = fragment.querySelector(".knitwear");
  const allEl = fragment.querySelector(".all");

  // 상품 화면에 그리기
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const productForm = fragment.querySelector(".product-form");
    const imageEl = fragment.querySelector(".image");
    imageEl.src = product.mainImgUrl;
    let postId = product.id;

    productForm.addEventListener("click", e => {
      e.preventDefault();
      drawProductDetail(postId);
    });
    productForm.addEventListener("mouseover", e => {
      e.preventDefault();
      // alert('test');
      // productForm.pseudoStyle("after","content","content");
    });
    productListEl.appendChild(fragment);
  }

  // 전체보기
  allEl.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.get("/products");
    const productData = res.data;
    drawScreen(productData);
  });

  // scarf
  scarfEl.addEventListener("click", async e => {
    e.preventDefault();

    const res = await api.get("/products", {
      params: {
        category: "scarf"
      }
    });
    const productData = res.data;
    drawScreen(productData);
  });

  // shirts
  shirtsEl.addEventListener("click", async e => {
    e.preventDefault();

    const res = await api.get("/products", {
      params: {
        category: "shirts"
      }
    });
    const productData = res.data;
    drawScreen(productData);
  });

  // pants
  pantsEl.addEventListener("click", async e => {
    e.preventDefault();
    pantsEl.classList.add("category-clicked");
    const res = await api.get("/products", {
      params: {
        category: "pants"
      }
    });
    const productData = res.data;

    drawScreen(productData);
  });
  // knitwear
  knitwearEl.addEventListener("click", async e => {
    e.preventDefault();
    knitwearEl.classList.add("category-clicked");
    const res = await api.get("/products", {
      params: {
        category: "knitwear"
      }
    });
    const productData = res.data;

    drawScreen(productData);
  });

  // 문서 삽입
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

async function drawProductDetail(postId) {
  const fragment = document.importNode(templates.productDetail, true);
  const title = fragment.querySelector(".title");
  const description = fragment.querySelector(".description");
  const detailImage = fragment.querySelector(".detail-image");
  const back = fragment.querySelector(".back");
  const optionList = fragment.querySelector(".option-list");
  const productOptionForm = fragment.querySelector(".product-option-form");

  const res = await api.get("/products/" + postId, {
    params: {
      _embed: "options"
    }
  });
  const detailData = res.data;
  title.textContent = detailData.title;
  description.textContent = detailData.description;
  detailImage.src = detailData.detailImgUrls;
  const productId = detailData.id;
  const optionsEl = detailData.options;

  optionsEl.forEach(item => {
    const fragment = document.importNode(templates.productOptionForm, true);
    const optionEl = fragment.querySelector(".option");
    optionEl.textContent = `${item.title} - ${item.price}원`;
    optionEl.setAttribute("value", item.id);
    optionList.appendChild(fragment);
  });

  back.addEventListener("click", e => {
    e.preventDefault();
    drawScreen(null);
  });

  // 장바구니에 담기
  productOptionForm.addEventListener("submit", async e => {
    e.preventDefault();
    const optionId = e.target.elements.options.value;
    let quantity = e.target.elements.quantity.value;
    let isCartNotEmpty = false;
    let overlapItem = null;
    await getCartList();

    if (cartLists) {
      // 카드가 null 이 아니면
      isCartNotEmpty = true;
      for (const item of cartLists) {
        isCartNotEmpty = true;
        if (optionId === item.optionId) {
          //중복이면
          overlapItem = item;
        }
      }
    } else {
      // 카드가 null 임
      isCartNotEmpty = false;
    }

    if (isCartNotEmpty && overlapItem) {
      // 카드가 null이 아니면
      quantity =
        Number.parseInt(quantity) + Number.parseInt(overlapItem.quantity);
      await api.patch("/cartItems/" + overlapItem.id, {
        ordered: false,
        optionId,
        quantity
      });
    } else {
      await api.post("/cartItems", {
        ordered: false,
        optionId,
        quantity
      });
    }

    drawCartForm();
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 장바구니 리스트 가져오기
async function getCartList() {
  const username = localStorage.getItem("loginUser", username);
  const userRes = await api.get("/users", {
    params: {
      username
    }
  });
  const res = await api.get("/cartItems", {
    params: {
      ordered: false,
      userId: userRes.data[0].id,
      _expand: "option"
    }
  });

  // 으잉 이게 무슨 코드지
  cartLists = res.data;
}

// 장바구니 그리기
async function drawCartForm() {
  const fragment = document.importNode(templates.cartForm, true);
  const cartFormEl = fragment.querySelector(".cart-form-ul");
  const orderButton = fragment.querySelector(".order-button");
  const deleteButton = fragment.querySelector(".delete");
  const continueButton = fragment.querySelector(".continue-shopping");
  const totalPrice = fragment.querySelector(".total-price");

  await getCartList();

  const params = new URLSearchParams();
  cartLists.forEach(c => {
    params.append("id", c.option.productId);
  });

  const res2 = await api.get("/products", {
    params
  });
  const idList = res2.data;
  // 체크된 아이템을 확인하기 위한
  const cartItemArr = [];

  // 장바구니 아이템 하나씩 추가
  for (const item of cartLists) {
    const fragment = document.importNode(templates.cartItem, true);
    const checkDelete = fragment.querySelector(".check-delete");
    const cartItem = fragment.querySelector(".cart-item");
    const title = fragment.querySelector(".title");
    const option = fragment.querySelector(".option");
    const image = fragment.querySelector(".image");
    const price = fragment.querySelector(".price");
    const quantity = fragment.querySelector(".quantity");

    checkDelete.setAttribute("value", item.id);
    option.textContent = item.option.title;
    price.textContent = item.option.price;
    quantity.value = item.quantity;
    const id = idList.find(i => i.id === item.option.productId);
    title.textContent = id.title;
    image.src = id.mainImgUrl;
    cartItemArr.push(cartItem);
    cartFormEl.appendChild(fragment);
  }

  // 최종 가격 그리기
  let totalP = 0;
  for (const item of cartLists) {
    totalP = totalP + item.quantity * item.option.price;
  }
  totalPrice.textContent = "Total Price : " + totalP;

  // 장바구니에서 수량 변경 시
  cartFormEl.addEventListener("change", e => {});
  continueButton.addEventListener("click", e => {
    e.preventDefault();
    drawScreen();
  });
  orderButton.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.post("/orders", {
      orderTime: Date.now() // 현재 시각을 나타내는 정수
    });

    const orderId = res.data.id;

    // 실험 코드
    for (const item of cartItemArr) {
      if (item.firstElementChild.checked) {
        const patchId = item.firstElementChild.value;

        // 위에서 만든 주문 객체의 id를 장바구니 항목의 orderId에 넣어줍니다.
        await api.patch("/cartItems/" + patchId, {
          ordered: true,
          orderId
        });
      }
    }
    //

    drawOrderedForm();
  });

  deleteButton.addEventListener("click", async e => {
    for (const item of cartItemArr) {
      if (item.firstElementChild.checked) {
        const deleteId = item.firstElementChild.value;
        await api.delete("/cartItems/" + deleteId);
      }
    }
    drawCartForm();
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 주문내역 그리기
async function drawOrderedForm() {
  const fragment = document.importNode(templates.orderedForm, true);
  const orderedForm = fragment.querySelector(".ordered-form-ul");

  const res = await api.get("/orders", {
    params: {
      _embed: "cartItems",
      ordered: true
    }
  });
  const orderList = res.data;

  const params = new URLSearchParams();
  params.append("_embed", "cartItems");
  params.append("_expand", "product");
  params.append("ordered", true);
  orderList.forEach(c => {
    for (const item of c.cartItems) {
      params.append("id", item.optionId);
      console.log(item.optionId)
    }
  });

  const res2 = await api.get("/options", {
    params
  });

  const optionsFind = res2.data;


  for (const search of orderList) {
    const fragment = document.importNode(templates.orderedFormItem, true);
    const orderedFormItem = fragment.querySelector(".ordered-form-item-ul");
    const orderId = fragment.querySelector(".order-id");
    const orderTime = fragment.querySelector(".order-time");
    const deleteButton = fragment.querySelector(".delete");

    let orderedList = [];
    for(const o of optionsFind){
      for(const i of search.cartItems){
        if(i.optionId==o.id){
          // quantity를 가져오기 위해 cartItems에 넣어줌.
          o.cartItems = i.quantity;
          orderedList.push(o);
        }
      }
      // filter는 왜 안될까
      // orderedList = search.cartItems.filter(
      //   item => item.optionId == o.id
      // )
    }

    orderId.textContent = search.id;
    orderTime.textContent = search.orderTime;

    deleteButton.addEventListener("click", async e => {
      await api.delete("/orders/" + item.id);
      drawOrderedForm();
    });

    for(const item of orderedList) {
      console.log(item)
      const fragment = document.importNode(templates.orderedItemDetail, true);
      const title = fragment.querySelector(".title");
      const image = fragment.querySelector(".image");
      const price = fragment.querySelector(".price");
      const quantity = fragment.querySelector(".quantity");
      const optionEl = fragment.querySelector(".option");

      optionEl.textContent = item.title;
      quantity.textContent = item.cartItems;
      price.textContent = item.price;

      title.textContent = item.product.title;
      image.src = item.product.mainImgUrl;
      orderedFormItem.appendChild(fragment);
    }
    orderedForm.appendChild(fragment);
  }

  rootEl.textContent = "";
  rootEl.append(fragment);
}

// 회원가입 폼 그리기
function drawRegisterForm() {
  const fragment = document.importNode(templates.registerForm, true);
  const registerForm = fragment.querySelector(".user-register-form");
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const username = e.target.elements.newname.value;
    const password = e.target.elements.newpassword.value;
    await api.post("/users/register", {
      username,
      password
    });
    localStorage.setItem("loginUser", username);
    drawRegisterSuccess(username);
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

function drawRegisterSuccess(username) {
  const fragment = document.importNode(templates.registerSuccessForm, true);
  const welcome = fragment.querySelector(".welcome");
  const continueButton = fragment.querySelector(".continue-button");
  welcome.textContent = `반갑습니다 ${username}님!`;
  continueButton.addEventListener("click", e => {
    e.preventDefault();
    drawScreen(null);
  });
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 로그인 시
async function drawMyPageForm() {
  const fragment = document.importNode(templates.myPageForm, true);
  const logout = fragment.querySelector(".logout");
  const goToCart = fragment.querySelector(".go-to-cart");
  const hello = fragment.querySelector(".hello");
  const orderedList = fragment.querySelector(".ordered-list");
  hello.textContent = `안녕하세요. ${localStorage.getItem("loginUser")}님`;

  goToCart.addEventListener("click", e => {
    e.preventDefault();
    drawCartForm();
  });
  // 로그아웃
  logout.addEventListener("click", e => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginUser");
    drawScreen(null);
  });
  orderedList.addEventListener("click", e => {
    e.preventDefault();
    drawOrderedForm();
  });
  headerEl.appendChild(fragment);
}

async function drawScreen(productData) {
  drawTitleForm();
  const token = localStorage.getItem("token");
  if (token) {
    drawMyPageForm();
  } else {
    drawLoginForm();
  }

  if (productData) {
    drawProductList(productData);
  } else {
    const res = await api.get("/products");
    const productData = res.data;
    drawProductList(productData);
  }
}

drawScreen(null);

// 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입
