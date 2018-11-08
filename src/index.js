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
  orderedFormItem: document.querySelector("#ordered-form-item").content
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
  const scarfEl = fragment.querySelector(".scarf");
  const pantsEl = fragment.querySelector(".pants");
  const allEl = fragment.querySelector(".all");

  // 상품 화면에 그리기
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const productForm = fragment.querySelector(".product-form");
    // const titleEl = fragment.querySelector(".title");
    // const descriptionEl = fragment.querySelector(".description");
    const imageEl = fragment.querySelector(".image");
    // titleEl.textContent = product.title;
    // descriptionEl.textContent = product.description;
    imageEl.src = product.mainImgUrl;
    let postId = product.id;

    productForm.addEventListener("click", e => {
      e.preventDefault();
      drawProductDetail(postId);
    });
    productListEl.appendChild(fragment);
  }

  // 전체보기
  allEl.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.get("/products");

    const productData = res.data;
    // drawProductList(productData);
    drawScreen(productData);
  });

  // top
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

  // pants
  pantsEl.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.get("/products", {
      params: {
        category: "pants"
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
    const quantity = e.target.elements.quantity.value;
    await api.post("/cartItems", {
      ordered: false,
      optionId,
      quantity
    });
    drawCartForm();
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 장바구니 그리기
async function drawCartForm() {
  const fragment = document.importNode(templates.cartForm, true);
  const cartFormEl = fragment.querySelector(".cart-form");
  const orderButton = fragment.querySelector(".order-button");
  const deleteButton = fragment.querySelector(".delete");

  const username = localStorage.getItem("loginUser", username);
  const userRes = await api.get("/users", {
    params: {
      username
    }
  });
  const res = await api.get("/cartItems", {
    params: {
      ordered: false,
      userId: +userRes.data[0].id,
      _expand: "option"
    }
  });

  const cartListArr = [];
  // 으잉 이게 무슨 코드지
  const cartLists = res.data;
  const params = new URLSearchParams();
  cartLists.forEach(c => {
    params.append("id", c.option.productId);
    cartListArr.push(c.id);
  });
  // console.log(cartListArr)

  const res2 = await api.get("/products", {
    params
  });
  const idList = res2.data;
  const cartItemArr = [];
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
    quantity.textContent = item.quantity;
    const id = idList.find(i => i.id === item.option.productId);
    title.textContent = id.title;
    image.src = id.mainImgUrl;
    cartItemArr.push(cartItem);
    cartFormEl.appendChild(fragment);
  }

  orderButton.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.post("/orders", {
      orderTime: Date.now() // 현재 시각을 나타내는 정수
    });

    const orderId = res.data.id;
    console.log("orderId:" + orderId);

    // 실험 코드
    console.log(cartItemArr);
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
    console.log(cartItemArr);
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
  const orderedForm = fragment.querySelector(".ordered-form");

  const res = await api.get("/orders");
  const orderedList = res.data;

  orderedList.forEach(item => {
    const fragment = document.importNode(templates.orderedFormItem, true);
    const orderId = fragment.querySelector(".order-id");
    const orderTime = fragment.querySelector(".order-time");
    orderId.textContent = item.id;
    orderTime.textContent = item.orderTime;

    orderedForm.appendChild(fragment);
  })

  rootEl.textContent="";
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
  logout.addEventListener("click", e => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginUser");
    drawScreen(null);
  });
  orderedList.addEventListener("click", e => {
    e.preventDefault();
    drawOrderedForm();
  })
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
