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
  registerForm: document.querySelector('#user-register-form').content,
  registerSuccessForm : document.querySelector('#register-success-form').content,
  myPageForm: document.querySelector('#my-page-form').content
};

// 로그인 폼 그리기
async function drawLoginForm() {
  const fragment = document.importNode(templates.loginForm, true);
  const loginFormEl = fragment.querySelector(".login-form");
  const registerButtonEl = fragment.querySelector('.register-button');

  registerButtonEl.addEventListener('click', e => {
    e.preventDefault();
    drawRegisterForm();
  })
  loginFormEl.addEventListener("submit", async e => {
    e.preventDefault();
    const username = e.target.elements.username.value;
    const password = e.target.elements.password.value;
    const res = await api.post("/users/login", {
      username,
      password
    });
    localStorage.setItem("token", res.data.token);
    drawMyPageForm(username);
  });

  // 문서 삽입
  rootEl.textContent = "";
  rootEl.appendChild(fragment);
  drawProductList();

}

// 메인 화면에 상품 리스트 그리기
async function drawProductList() {
  const fragment = document.importNode(templates.productListForm, true);
  const productListEl = fragment.querySelector(".product-list");
  // const topEl = fragment.querySelector('.top');
  // const pantsEl = fragment.querySelector('.pants');

  const res = await api.get("/products");

  const productData = res.data;
  for (const product of productData) {
    const fragment = document.importNode(templates.productForm, true);
    const titleEl = fragment.querySelector(".title");
    // const descriptionEl = fragment.querySelector(".description");
    const imageEl = fragment.querySelector(".image");
    console.log(product.title);
    titleEl.textContent = product.title;
    // descriptionEl.textContent = product.description;
    imageEl.src = product.mainImgUrl;
    productListEl.appendChild(fragment);
  }

  // 문서 삽입
  // rootEl.textContent = "";
  rootEl.appendChild(fragment);
}

// 회원가입 폼 그리기
function drawRegisterForm(){
  const fragment = document.importNode(templates.registerForm, true);
  const registerForm = fragment.querySelector('.user-register-form');
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const username = e.target.elements.newname.value;
    const password = e.target.elements.newpassword.value;
    console.log(username);
    console.log(password);
    const res = await api.post('/users/register', {
      username,
      password
    })
    drawRegisterSuccess(username);

  })

  rootEl.textContent='';
  rootEl.appendChild(fragment);
}

function drawRegisterSuccess(username){
  const fragment = document.importNode(templates.registerSuccessForm, true);
  const welcome = fragment.querySelector('.welcome');
  const continueButton = fragment.querySelector('.continue-button');
  welcome.textContent=`반갑습니다 ${username}님!`;
  continueButton.addEventListener('click', e => {
    e.preventDefault();
    drawMyPageForm(username);
  })
  rootEl.textContent='';
  rootEl.appendChild(fragment);
}

function drawMyPageForm(username){
  const fragment = document.importNode(templates.myPageForm, true);
  const hello = fragment.querySelector('.hello');
  hello.textContent=`안녕하세요. ${username}님`;

  rootEl.textContent='';
  rootEl.appendChild(fragment);
  drawProductList();
}

drawLoginForm();

// 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입
