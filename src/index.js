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
let cartLists; //장바구니 리스트 변수
// 체크된 아이템을 확인하기 위한
let cartItemChecked = [];

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

// 타이틀 그리기
function drawTitleForm() {
  const fragment = document.importNode(templates.titleForm, true);
  const titleFormEl = fragment.querySelector(".title-form");
  titleFormEl.addEventListener("click", e => {
    e.preventDefault();
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
  // 회원가입 버튼
  registerButtonEl.addEventListener("click", e => {
    e.preventDefault();
    drawRegisterForm();
  });
  // 로그인 버튼
  loginFormEl.addEventListener("submit", async e => {
    e.preventDefault();
    const username = e.target.elements.username.value;
    const password = e.target.elements.password.value;
    const res = await api.post("/users/login", {
      username,
      password
    });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("loginUser", username);
    drawScreen(null);
  });
  headerEl.appendChild(fragment);
}

// 메인 화면에 카테고리별로 상품 리스트 그리기
async function drawProductList(productData) {
  const fragment = document.importNode(templates.productListForm, true);
  const productListEl = fragment.querySelector(".product-list");
  const categoryLists = fragment.querySelectorAll("li");

  // 상품 화면에 그리기
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const productForm = fragment.querySelector(".product-form");
    const cover = fragment.querySelector(".cover");
    const imageEl = fragment.querySelector(".image");
    imageEl.src = product.mainImgUrl;
    cover.textContent = product.title;
    let postId = product.id;

    productForm.addEventListener("click", e => {
      e.preventDefault();
      drawProductDetail(postId);
    });
    productForm.addEventListener("mouseover", e => {
      e.preventDefault();
      cover.style.backgroundColor = "rgba(245, 245, 245, 0.7)";
      cover.style.color = "rgba(6, 6, 6, 1.0)";
    });
    productForm.addEventListener("mouseleave", e => {
      e.preventDefault();
      cover.style.backgroundColor = "rgba(245, 245, 245, 0)";
      cover.style.color = "rgba(6, 6, 6, 0)";
    });
    productListEl.appendChild(fragment);
  }

  // 카테고리 그리기
  categoryLists.forEach(item => {
    item.addEventListener("mouseover", e => {
      item.style.borderBottom = "1px solid #000";
    });
    item.addEventListener("mouseleave", e => {
      item.style.borderBottom = "1px solid rgba(0, 0, 0, 0)";
    });
    item.addEventListener("click", async e => {
      e.preventDefault();
      const category = item.textContent;
      const res = await api.get("/products");
      let productData = res.data;
      if (category !== "all") {
        productData = productData.filter(item => item.category === category);
      }
      drawScreen(productData);
    });
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 상품 상세 페이지 그리기
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
    optionEl.textContent = `${item.title} - ${item.price}₩`;
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
    let isCartNotEmpty = false; // 장바구니에 상품이 있으면 중복 상품 체크
    let overlapItem = null; // 중복 상품이면 수량만 변경해주기 위해

    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인 후 이용해주세요.");
    } else {
      await getCartList();
      if (cartLists) {
        // 장바구니에 상품이 있으면 중복 상품인지 체크
        isCartNotEmpty = true;
        for (const item of cartLists) {
          isCartNotEmpty = true;
          if (optionId === item.optionId) {
            overlapItem = item;
          }
        }
      } else {
        isCartNotEmpty = false;
      }

      // 같은 상품이 있으면
      if (isCartNotEmpty && overlapItem) {
        quantity =
          Number.parseInt(quantity) + Number.parseInt(overlapItem.quantity);
        await api.patch("/cartItems/" + overlapItem.id, {
          ordered: false,
          optionId,
          quantity
        });
      } else {
        // 새로운 상품이 들어오면
        await api.post("/cartItems", {
          ordered: false,
          optionId,
          quantity
        });
      }
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

  // 장바구니 아이템 하나씩 추가
  for (const item of cartLists) {
    const fragment = document.importNode(templates.cartItem, true);
    const checkBox = fragment.querySelector(".check-box");
    const cartItem = fragment.querySelector(".cart-item");
    const title = fragment.querySelector(".title");
    const option = fragment.querySelector(".option");
    const image = fragment.querySelector(".image");
    const price = fragment.querySelector(".price");
    const quantity = fragment.querySelector(".quantity");

    checkBox.setAttribute("value", item.id);
    option.textContent = item.option.title;
    price.textContent = item.option.price;
    quantity.value = item.quantity;
    const id = idList.find(i => i.id === item.option.productId);
    title.textContent = id.title;
    image.src = id.mainImgUrl;

    // 체크 그리기
    if (cartItemChecked.includes(item.id)) {
      checkBox.setAttribute("checked", "");
    }

    // 장바구니 체크박스 핸들
    checkBox.addEventListener("input", e => {
      e.preventDefault();
      console.log(e.target);
      if (e.target.checked) {
        const temp = cartItemChecked.every(item => item !== e.target.value);
        if (temp) {
          cartItemChecked.push(Number.parseInt(e.target.value));
        }
      } // 체크 풀면
      else {
        cartItemChecked = cartItemChecked.filter(i => i != e.target.value);
        for (let i = 0; i < cartItemChecked; i++) {
          if (cartItemChecked[i] === e.target.value) {
            cartItemChecked = cartItemChecked.splice(i, 1);
          }
        }
      }

      drawCartForm();
    });
    // 수량 변경 시
    quantity.addEventListener("change", async e => {
      e.preventDefault();
      await api.patch("/cartItems/" + item.id, {
        quantity: quantity.value
      });

      drawCartForm();
    });

    cartFormEl.appendChild(fragment);
  }

  // // 최종 가격 그리기
  let totalP = 0;
  for (const item of cartItemChecked) {
    const temp = cartLists.find(i => i.id === item);
    totalP = totalP + temp.quantity * temp.option.price;
  }
  totalPrice.textContent = "Total Price : " + totalP;

  continueButton.addEventListener("click", e => {
    e.preventDefault();
    drawScreen();
  });

  // 주문하기
  orderButton.addEventListener("click", async e => {
    e.preventDefault();

    if (!cartItemChecked[0]) {
      alert("주문할 상품이 없습니다.");
    } else {
      const res = await api.post("/orders", {
        orderTime: Date.now() // 현재 시각을 나타내는 정수
      });

      const orderId = res.data.id;

      // cartItemChecked 에 있는거 모두 주문 후 리스트에서는 제거
      for (const item of cartItemChecked) {
        await api.patch("/cartItems/" + item, {
          ordered: true,
          orderId
        });
        cartItemChecked = cartItemChecked.splice(item, 1);
      }
      drawOrderedForm();
    }
  });

  // 장바구니에서 선택 삭제
  deleteButton.addEventListener("click", async e => {
    if (!cartItemChecked[0]) {
      alert("삭제할 항목이 없습니다.");
    } else {
      for (const item of cartItemChecked) {
        await api.delete("/cartItems/" + item);
        cartItemChecked = cartItemChecked.splice(item, 1);
      }
      drawCartForm();
    }
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
      console.log(item.optionId);
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
    for (const o of optionsFind) {
      for (const i of search.cartItems) {
        if (i.optionId == o.id) {
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
      await api.delete("/orders/" + search.id);
      drawOrderedForm();
    });

    for (const item of orderedList) {
      console.log(item);
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
  const checkId = fragment.querySelector(".check-id");
  const username = fragment.querySelector(".newname");
  let validate = false;

  checkId.addEventListener("click", async e => {
    const res = await api.get("/users", {
      params: {
        username: username.value
      }
    });
    if (res.data[0]) {
      alert("이미 사용중인 아이디입니다.");
      validate = false;
    } else {
      alert("사용 가능한 아이디입니다.");
      validate = true;
    }
  });
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (validate) {
      const username = e.target.elements.newname.value;
      const password = e.target.elements.newpassword.value;
      await api.post("/users/register", {
        username,
        password
      });
      localStorage.setItem("loginUser", username);
      drawRegisterSuccess(username);
    } else {
      alert("아이디 중복 체크를 해주세요.");
    }
  });
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

function drawRegisterSuccess(username) {
  const fragment = document.importNode(templates.registerSuccessForm, true);
  const welcome = fragment.querySelector(".welcome");
  const continueButton = fragment.querySelector(".continue-button");
  welcome.textContent = `${username}`;
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
  hello.textContent = `${localStorage.getItem("loginUser")}`;

  goToCart.addEventListener("click", e => {
    e.preventDefault();
    drawCartForm();
  });
  // 로그아웃
  logout.addEventListener("click", e => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginUser");
    cartLists = [];
    cartItemChecked = [];
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
