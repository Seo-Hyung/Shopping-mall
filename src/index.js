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

const rootEl = document.querySelector(".root");
const templates = {
  loginForm: document.querySelector("#login-form").content,
  productListForm: document.querySelector("#product-list-form").content,
  productForm: document.querySelector("#product-form").content,
  registerForm: document.querySelector("#user-register-form").content,
  registerSuccessForm: document.querySelector("#register-success-form").content,
  myPageForm: document.querySelector("#my-page-form").content,
  productDetail: document.querySelector("#product-detail").content,
  productOptionForm : document.querySelector('#product-option-form').content
};

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
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 메인 화면에 카테고리별로 상품 리스트 그리기
async function drawProductList(productData) {
  const fragment = document.importNode(templates.productListForm, true);
  // const fragment2 = document.importNode(templates.productForm, true);
  const productListEl = fragment.querySelector(".product-list");
  const topEl = fragment.querySelector(".top");
  const pantsEl = fragment.querySelector(".pants");
  const allEl = fragment.querySelector(".all");

  // 상품 화면에 그리기
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const productForm = fragment.querySelector(".product-form");
    const titleEl = fragment.querySelector(".title");
    // const descriptionEl = fragment.querySelector(".description");
    const imageEl = fragment.querySelector(".image");
    titleEl.textContent = product.title;
    // descriptionEl.textContent = product.description;
    imageEl.src = product.mainImgUrl;
    let postId = product.id;

    productForm.addEventListener('click', e => {
      e.preventDefault();
      console.log(e.target);
      drawProductDetail(postId);
    })
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
  topEl.addEventListener("click", async e => {
    e.preventDefault();
    const res = await api.get("/products", {
      params: {
        category: "top"
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
  rootEl.appendChild(fragment);
}

async function drawProductDetail(postId){
  const fragment = document.importNode(templates.productDetail, true);
  const title = fragment.querySelector('.title');
  const description = fragment.querySelector('.description');
  const image = fragment.querySelector('.image');
  const detailImage = fragment.querySelector('.detail-image');
  const back = fragment.querySelector('.back');
  const addToCart = fragment.querySelector('.add-to-cart');
  const optionList = fragment.querySelector('.option-list');
  const quantity = fragment.querySelector('.quantity');

  const res = await api.get('/products/'+postId, {
    params : {
      _embed: 'options'
    }
  });
  const detailData = res.data;
  title.textContent = detailData.title;
  description.textContent = detailData.description;
  image.src = detailData.mainImgUrl;
  detailImage.src = detailData.detailImgUrls;
  const id = detailData.id;
  const options = detailData.options;

  quantity.addEventListener('change', e => {
    console.log(quantity.value);
    // const quantity = quantity.value;
  });

  options.forEach(item => {
    const fragment = document.importNode(templates.productOptionForm, true);
    const optionEl = fragment.querySelector('.option');
    // console.log(`${item.title} - ${item.price}원`);
    optionEl.textContent = `${item.title} - ${item.price}원`;

    optionList.appendChild(fragment);
  })



  back.addEventListener('click', e => {
    e.preventDefault();
    drawScreen(null);
  })


  // 이 부분 처리
  addToCart.addEventListener('click', async e => {
    e.preventDefault();
    await api.post('/cartItems', {
      userId,
      orderId: -1,
      optionId,
      quantity
    })
  })

  rootEl.textContent='';
  rootEl.appendChild(fragment);
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
  const hello = fragment.querySelector(".hello");
  hello.textContent = `안녕하세요. ${localStorage.getItem("loginUser")}님`;

  logout.addEventListener("click", e => {
    localStorage.removeItem("token");
    localStorage.removeItem("loginUser");
    drawScreen(null);
  });
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

async function drawScreen(productData) {
  rootEl.textContent = "";
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
