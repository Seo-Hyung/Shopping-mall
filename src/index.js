import "@babel/polyfill"; // 이 라인을 지우지 말아주세요!
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_URL
});

// 로그인 시 유지시키는 코드
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = "Bearer " + token;
  }
  return config;
});

const loadingScreen = document.querySelector(".loading-screen");
const headerEl = document.querySelector(".header");
const rootEl = document.querySelector(".root");
let cartLists; //장바구니 리스트 변수
let cartItemChecked = []; // 장바구니 체크된 리스트 변수

// Todo:
// 1. 코드 중복 제거
// 2. 변수 이름 규칙적으로

// const routes = {
//   '/': home,
//   '/top': top,
//   '/my-cart': myCart,
//   '/order-list': orderList,
// };

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
    const res2 = await api.get("/users");
    const userList = res2.data;
    if (userList.every(user => username !== user.username)) {
      alert("회원 정보가 없습니다.\n회원가입 후 이용해주세요.");
    } else {
      const res = await api.post("/users/login", {
        username,
        password
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("loginUser", username);
      drawScreen(null);
    }
  });

  headerEl.appendChild(fragment);
}

// 로그인 시 상단 마이페이지 그리기
async function drawMyPageForm() {
  const fragment = document.importNode(templates.myPageForm, true);
  const logout = fragment.querySelector(".logout");
  const goToCart = fragment.querySelector(".go-to-cart");
  const hello = fragment.querySelector(".hello");
  const orderedList = fragment.querySelector(".ordered-list");
  hello.textContent = `${localStorage.getItem("loginUser")}`;

  // 장바구니 가기 버튼
  goToCart.addEventListener("click", async e => {
    loadingScreen.style.display = "flex";
    e.preventDefault();
    await drawCartForm();
    loadingScreen.style.display = "none";
  });
  // 로그아웃
  logout.addEventListener("click", e => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginUser");
    cartLists = [];
    cartItemChecked = [];
    drawScreen(null);
  });
  // 주문내역 보기 버튼
  orderedList.addEventListener("click", e => {
    loadingScreen.style.display = "flex";
    e.preventDefault();
    drawOrderedForm();
    loadingScreen.style.display = "none";
  });

  headerEl.appendChild(fragment);
}

// 메인 화면에 카테고리 및 상품 리스트 그리기
async function drawProductList(productData) {
  loadingScreen.style.display = "flex";
  const fragment = document.importNode(templates.productListForm, true);
  const productListEl = fragment.querySelector(".product-list");
  const categoryLists = fragment.querySelectorAll("li");
  const pagination = fragment.querySelector(".pagination");
  const itemNumInPage = 8;

  // 카테고리 그리기
  categoryLists.forEach(item => {
    // 카테고리 애니메이션 효과
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

  // 페이지네이션
  let pageData = productData.slice(0, itemNumInPage);
  drawPageProducts(productListEl, pageData);
  for (let i = 1; i <= productData.length / itemNumInPage + 1; i++) {
    const page = document.createElement("span");
    page.textContent = i;
    if (i === 1) {
      page.classList.add("page-clicked");
    }
    page.addEventListener("click", e => {
      e.preventDefault();
      const pages = document.querySelectorAll(".page-clicked");
      for (const p of pages) {
        p.classList.remove("page-clicked");
      }
      page.classList.add("page-clicked");
      productListEl.textContent = "";
      let pageData = productData.slice(
        (i - 1) * itemNumInPage,
        i * itemNumInPage
      );
      drawPageProducts(productListEl, pageData);
    });
    pagination.appendChild(page);
  }

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
  loadingScreen.style.display = "none";
}

// 상품 화면에 페이지 별로 상품들 그리기
function drawPageProducts(productListEl, productData) {
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const productForm = fragment.querySelector(".product-form");
    const cover = fragment.querySelector(".cover");
    const imageEl = fragment.querySelector(".image");
    imageEl.src = product.mainImgUrl;
    cover.textContent = product.title;
    let postId = product.id;

    // 상품 애니메이션 효과
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
}

// 상품 상세 페이지 그리기
async function drawProductDetail(postId) {
  loadingScreen.style.display = "flex";
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

  // 옵션 목록 가져오기
  optionsEl.forEach(item => {
    const fragment = document.importNode(templates.productOptionForm, true);
    const optionEl = fragment.querySelector(".option");
    optionEl.textContent = `${item.title} (£${item.price}.00)`;
    optionEl.setAttribute("value", item.id);
    optionList.appendChild(fragment);
  });

  // 다른 상품 보기 버튼
  back.addEventListener("click", e => {
    e.preventDefault();
    drawScreen(null);
  });

  // 장바구니에 담기 버튼
  productOptionForm.addEventListener("submit", async e => {
    loadingScreen.style.display = "flex";
    e.preventDefault();
    const optionId = e.target.elements.options.value;
    let quantity = e.target.elements.quantity.value;
    let isCartNotEmpty = false; // 장바구니에 상품이 있으면 중복 상품 체크
    let overlapItem = null; // 중복 상품 정보를 담기 위한 변수

    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인 후 이용해주세요.");
    } else {
      if (cartLists) {
        // 장바구니에 상품이 있으면 중복 상품인지 체크
        isCartNotEmpty = true;
        for (const item of cartLists) {
          if (optionId === item.optionId) {
            overlapItem = item;
          }
        }
      }

      // 같은 상품이 있으면 수량만 변경
      if (isCartNotEmpty && overlapItem) {
        quantity =
          Number.parseInt(quantity) + Number.parseInt(overlapItem.quantity);
        await api.patch("/cartItems/" + overlapItem.id, {
          ordered: false,
          optionId,
          quantity
        });
      } else {
        // 새로운 상품이 들어오면 아이템 추가
        await api.post("/cartItems", {
          ordered: false,
          optionId,
          quantity
        });
      }
    }

    drawCartForm();
    loadingScreen.style.display = "none";
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
  // history.pushState({ data: 'detail' }, 'Detail', '/product-detail');
  loadingScreen.style.display = "none";
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
    const title = fragment.querySelector(".title");
    const option = fragment.querySelector(".option");
    const image = fragment.querySelector(".image");
    const price = fragment.querySelector(".price");
    const quantity = fragment.querySelector(".quantity");

    checkBox.setAttribute("value", item.id);
    option.textContent = item.option.title;
    price.textContent = "£" + item.option.price + ".00";
    quantity.value = item.quantity;
    const id = idList.find(i => i.id === item.option.productId);
    title.textContent = id.title;
    image.src = id.mainImgUrl;

    // 체크 리스트 체크 표시 그려주기
    if (cartItemChecked.includes(item.id)) {
      checkBox.setAttribute("checked", "");
    }

    // 장바구니 체크박스 핸들
    checkBox.addEventListener("input", e => {
      loadingScreen.style.display = "flex";
      e.preventDefault();
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

      drawTotalPrice(totalPrice);
      loadingScreen.style.display = "none";
    });

    // 수량 변경 시
    quantity.addEventListener("change", async e => {
      // 낙관적 업데이트 이용
      // e.preventDefault();
      item.quantity = e.target.value;
      drawTotalPrice(totalPrice);

      await api.patch("/cartItems/" + item.id, {
        quantity: quantity.value
      });
    });

    cartFormEl.appendChild(fragment);
  }

  // 최종 가격 그리기
  drawTotalPrice(totalPrice);

  // 쇼핑 계속하기 버튼
  continueButton.addEventListener("click", e => {
    e.preventDefault();
    drawScreen();
  });

  // 주문하기 버튼
  orderButton.addEventListener("click", async e => {
    e.preventDefault();

    if (!cartItemChecked[0]) {
      alert("주문할 상품이 없습니다.\n상품을 선택해주세요.");
    } else {
      loadingScreen.style.display = "flex";
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
      loadingScreen.style.display = "none";
    }
  });

  // 장바구니에서 선택 삭제
  deleteButton.addEventListener("click", async e => {
    if (!cartItemChecked[0]) {
      alert("삭제할 항목이 없습니다.\n상품을 선택해주세요.");
    } else {
      loadingScreen.style.display = "flex";
      for (const item of cartItemChecked) {
        await api.delete("/cartItems/" + item);
        cartItemChecked = cartItemChecked.splice(item, 1);
      }
      drawCartForm();
      loadingScreen.style.display = "none";
    }
  });

  // history.pushState({ data: 'my-cart' }, 'My Cart', '/my-cart');
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 최종 가격 그리기
function drawTotalPrice(totalPrice) {
  let totalP = 0;
  for (const item of cartItemChecked) {
    const temp = cartLists.find(i => i.id === item);
    totalP = totalP + temp.quantity * temp.option.price;
  }
  totalPrice.textContent = "Total Price : £ " + totalP + ".00";
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
    }

    orderId.textContent = search.id;
    orderTime.textContent = search.orderTime;

    // 주문 내역 항목 삭제 버튼
    deleteButton.addEventListener("click", async e => {
      loadingScreen.style.display = "flex";
      await api.delete("/orders/" + search.id);
      // 낙관적 업데이트를 위한 코드
      // for(let i=0; i<orderList.length; i++){
      //   if(orderList[i].id === e.target.id){
      //     orderList.splice(i, 1);
      //   }
      // }
      drawOrderedForm();
      loadingScreen.style.display = "none";
    });

    for (const item of orderedList) {
      const fragment = document.importNode(templates.orderedItemDetail, true);
      const title = fragment.querySelector(".title");
      const image = fragment.querySelector(".image");
      const price = fragment.querySelector(".price");
      const quantity = fragment.querySelector(".quantity");
      const optionEl = fragment.querySelector(".option");

      optionEl.textContent = item.title;
      quantity.textContent = item.cartItems;
      price.textContent = "£" + item.price + ".00 (1ea)";

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
  // loadingScreen.style.display = "flex";
  const fragment = document.importNode(templates.registerForm, true);
  const registerForm = fragment.querySelector(".user-register-form");
  const checkId = fragment.querySelector(".check-id");
  const username = fragment.querySelector(".newname");
  let validate = false;

  // 아이디 중복 확인 버튼
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

  // 가입 완료 버튼
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    // 낙관적 업데이트 이용
    if (validate) {
      const username = e.target.elements.newname.value;
      const password = e.target.elements.newpassword.value;
      localStorage.setItem("loginUser", username);
      localStorage.setItem("token", "token");
      headerEl.textContent = "";
      drawTitleForm();
      drawMyPageForm();
      drawRegisterSuccess(username);
      await api.post("/users/register", {
        username,
        password
      });
      const res = await api.post("/users/login", {
        username,
        password
      });
      localStorage.setItem("token", res.data.token);
    } else {
      alert("아이디 중복 체크를 해주세요.");
    }
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 회원가입 성공 화면 그리기
function drawRegisterSuccess(username) {
  const fragment = document.importNode(templates.registerSuccessForm, true);
  const welcome = fragment.querySelector(".welcome");
  const continueButton = fragment.querySelector(".continue-button");
  welcome.textContent = `${username}`;

  // 쇼핑하러가기 버튼
  continueButton.addEventListener("click", e => {
    e.preventDefault();
    drawScreen(null);
  });

  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 헤더, 루트, 푸터 차례대로 붙여서 전체 그려주는 메인 드로잉 폼
async function drawScreen(productData) {
  // 타이틀 그리기
  drawTitleForm();

  // 헤더 그리기
  const token = localStorage.getItem("token");
  if (token) {
    drawMyPageForm();
  } else {
    drawLoginForm();
  }

  // 루트 그리기
  if (productData) {
    drawProductList(productData);
  } else {
    const res = await api.get("/products");
    const productData = res.data;
    drawProductList(productData);
  }
}

drawScreen(null);

// 참고 : 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입
