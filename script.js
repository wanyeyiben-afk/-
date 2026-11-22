// Firebaseの機能を読み込む
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyCOIK6ttm3Icp-ggKujebiHk21abig8mFw",
  authDomain: "assignment-management-ap-939da.firebaseapp.com",
  projectId: "assignment-management-ap-939da",
  storageBucket: "assignment-management-ap-939da.firebasestorage.app",
  messagingSenderId: "1073181301145",
  appId: "1:1073181301145:web:3899defdd318dae3c1db08"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// Google認証を準備
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Firestoreを準備
const db = getFirestore(app);

// Firestoreのリアルタイム同期を管理
let unsubscribeTasks = null;

// ログイン画面の要素を取得
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const userStatus = document.getElementById("user-status");

// Googleログイン
loginButton.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("ログインエラー:", error);
    alert("ログインできませんでした。");
  }
});

// ログアウト
logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("ログアウトエラー:", error);
    alert("ログアウトできませんでした。");
  }
});

// 保存されている課題を読み込む
let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem("tasks")) || [];
} catch (error) {
  tasks = [];
}

// 課題を保存する関数
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));

  if (auth.currentUser) {
    saveTasksToFirestore();
  }
}

// Firestoreに課題を保存する
async function saveTasksToFirestore() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userId = currentUser.uid;
    const tasksToSave = [...tasks];

    for (const task of tasksToSave) {
      await setDoc(
        doc(db, "users", userId, "tasks", String(task.id)),
        task
      );
    }

    console.log("Firestoreへの保存に成功しました");

  } catch (error) {
    console.error("Firestore保存エラー:", error);
  }
}

// Firestoreから課題を削除する
async function deleteTaskFromFirestore(taskId) {
  try {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;

    await deleteDoc(
      doc(db, "users", userId, "tasks", String(taskId))
    );

    console.log("Firestoreから課題を削除しました");

  } catch (error) {
    console.error("Firestore削除エラー:", error);
  }
}

// Firestoreの変更をリアルタイムで受け取る
function startTasksSync() {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;

  // 以前の同期を解除する
  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  // Firestoreの課題を監視する
  let isFirstSnapshot = true;

  unsubscribeTasks = onSnapshot(
    collection(db, "users", userId, "tasks"),

    async (snapshot) => {

      // サーバーからの初回データが届くまでは端末内の課題を維持する
      if (isFirstSnapshot && snapshot.metadata.fromCache) {
        displayTasks();
        return;
      }

      // 初回ログイン時、クラウド側が空なら端末内の課題を移す
      if (isFirstSnapshot) {
        isFirstSnapshot = false;

        if (snapshot.empty && tasks.length > 0) {
          await saveTasksToFirestore();
          return;
        }
      }

      tasks = snapshot.docs.map(doc => doc.data());

      // 端末にも保存する
      localStorage.setItem("tasks", JSON.stringify(tasks));

      // 画面を更新する
      displayTasks();

      console.log("課題を同期しました");
    },

    (error) => {
      console.error("同期エラー:", error);
    }
  );
}

// ログイン状態を確認
onAuthStateChanged(auth, (user) => {

  if (user) {

    userStatus.textContent = user.displayName + " でログイン中";

    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";

    // Firestoreのリアルタイム同期を開始する
    startTasksSync();

  } else {

    // ログアウトしたらリアルタイム同期を停止する
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }

    userStatus.textContent = "ログインしていません";

    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
  }
});

// HTMLの要素を取得
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

// 課題を登録する
taskForm.addEventListener("submit", function(event) {

  event.preventDefault();

  const name = document.getElementById("task-name").value;
  const className = document.getElementById("class-name").value;
  const dueDate = document.getElementById("due-date").value;

  const task = {
    id: Date.now(),
    name: name,
    className: className,
    dueDate: dueDate,
    completed: false
  };

  tasks.push(task);

  saveTasks();
  displayTasks();

  taskForm.reset();
});

// 課題一覧を表示する
function displayTasks() {

  taskList.innerHTML = "";

  const sortedTasks = [...tasks].sort((a, b) => {
    return a.dueDate.localeCompare(b.dueDate);
  });

  sortedTasks.forEach(function(task) {

    const item = document.createElement("div");
    item.className = "task-item";

    const title = document.createElement("h3");
    title.textContent = task.name;

    const subject = document.createElement("p");
    subject.textContent = "授業：" + (task.className || "未入力");

    const deadline = document.createElement("p");
    deadline.textContent = "締め切り：" + task.dueDate;

    const status = document.createElement("p");
    status.textContent = task.completed ? "提出済み" : "未提出";

    // 提出状態変更ボタン
    const completeButton = document.createElement("button");

    completeButton.textContent =
      task.completed ? "未提出に戻す" : "提出済みにする";

    completeButton.addEventListener("click", function() {

      task.completed = !task.completed;

      saveTasks();
      displayTasks();
    });

    // 削除ボタン
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", function() {

      tasks = tasks.filter(function(t) {
        return t.id !== task.id;
      });

      deleteTaskFromFirestore(task.id);

      saveTasks();
      displayTasks();
    });

    // 編集ボタン
    const editButton = document.createElement("button");
    editButton.textContent = "編集";

    editButton.addEventListener("click", function() {

      const newName = prompt("課題名を入力してください", task.name);

      if (newName === null) return;

      const newClassName = prompt(
        "授業名を入力してください",
        task.className
      );

      if (newClassName === null) return;

      const newDueDate = prompt(
        "締め切りを入力してください（例：2026-11-25）",
        task.dueDate
      );

      if (newDueDate === null) return;

      // 入力内容を確認
      if (
        newName.trim() === "" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)
      ) {
        alert("課題名または締め切りの日付を確認してください。");
        return;
      }

      // 課題情報を更新
      task.name = newName.trim();
      task.className = newClassName.trim();
      task.dueDate = newDueDate;

      saveTasks();
      displayTasks();
    });

    item.appendChild(editButton);
    item.appendChild(title);
    item.appendChild(subject);
    item.appendChild(deadline);
    item.appendChild(status);
    item.appendChild(completeButton);
    item.appendChild(deleteButton);

    taskList.appendChild(item);
  });

  if (tasks.length === 0) {
    taskList.textContent = "まだ課題は登録されていません。";
  }

  // 件数を更新
  document.getElementById("remaining-count").textContent =
    tasks.filter(t => !t.completed).length;

  document.getElementById("completed-count").textContent =
    tasks.filter(t => t.completed).length;

  // 明日が締め切りの課題を数える
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowText =
    tomorrow.getFullYear() + "-" +
    String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" +
    String(tomorrow.getDate()).padStart(2, "0");

  document.getElementById("tomorrow-count").textContent =
    tasks.filter(t =>
      !t.completed && t.dueDate === tomorrowText
    ).length;
}

// 最初に保存済みの課題を表示する
displayTasks();

// 画像選択
const imageInput = document.getElementById("task-image");
const imagePreview = document.getElementById("image-preview");

imageInput.addEventListener("change", function() {

  imagePreview.innerHTML = "";

  const file = imageInput.files[0];

  if (!file) return;

  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);

  imagePreview.appendChild(image);
});

// 写真の文字を読み取る
const readButton = document.getElementById("read-image");
const ocrStatus = document.getElementById("ocr-status");
const ocrResult = document.getElementById("ocr-result");

// OCRで読み取った文章から課題名を探す
function extractTaskName(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length > 0);

  const labels = [
    /課題名[：:]?\s*(.+)/,
    /課題タイトル[：:]?\s*(.+)/,
    /レポート名[：:]?\s*(.+)/,
    /提出物[：:]?\s*(.+)/,
    /課題[：:]?\s*(.+)/
  ];

  for (const line of lines) {
    for (const pattern of labels) {
      const match = line.match(pattern);

      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  // 課題名のラベルがない場合は、
  // 日付や操作案内ではない行を候補にする
  const ignoredWords = [
    "課題提出期間",
    "提出期限",
    "提出期間",
    "提出状況",
    "提出する",
    "ダウンロード",
    "ログアウト",
    "お知らせ",
    "授業資料",
    "トップページ"
  ];

  const candidate = lines.find(line =>
    line.length >= 3 &&
    line.length <= 80 &&
    !ignoredWords.some(word => line.includes(word)) &&
    !/\d{4}[\/年.-]\d{1,2}/.test(line)
  );

  return candidate || "";
}


// 授業名を探す
function extractClassName(text) {
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(
      /(?:授業名|科目名|講義名|科目)[：: ]*(.+)/
    );

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}


// 日付を探す
function extractDueDate(text) {
  const lines = text.split(/\r?\n/);

  const dateRegex =
    /(20\d{2})\s*[\/年.-]\s*(\d{1,2})\s*[\/月.-]\s*(\d{1,2})\s*日?\s*(?:[（(][^）)]*[）)])?\s*(\d{1,2})?\s*[:時]\s*(\d{2})?\s*分?/g;

  // 提出期限に関係する行を優先する
  const priorityLines = lines.filter(line =>
    /提出期限|締切|締め切り|課題提出期間|提出期間/.test(line)
  );

  const otherLines = lines.filter(line =>
    !priorityLines.includes(line)
  );

  const searchText = [
    ...priorityLines,
    ...otherLines
  ].join("\n");

  const matches = [...searchText.matchAll(dateRegex)];

  if (matches.length === 0) {
    return "";
  }

  // 提出期間が書かれている場合は最後の日付を採用する
  const match = matches[matches.length - 1];

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");

  // 時刻が読み取れた場合はその時刻を使用する
  // 時刻がない場合は00:00として表示し、確認画面で修正できるようにする
  const hour = match[4]
    ? match[4].padStart(2, "0")
    : "00";

  const minute = match[5]
    ? match[5]
    : "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}


// 写真を読み取る処理
readButton.addEventListener("click", async function() {

  const file = imageInput.files[0];

  if (!file) {
    alert("先に写真を選択してください。");
    return;
  }

  if (!window.Tesseract) {
    ocrStatus.textContent =
      "文字読み取り機能を読み込めませんでした。";
    return;
  }

  readButton.disabled = true;

  ocrStatus.textContent =
    "画像を準備しています。";

  try {

    // 画像を読み込む
    const sourceImage = await createImageBitmap(file);

    // 小さい文字を読み取りやすくするため画像を拡大する
    const maxSide = Math.max(
      sourceImage.width,
      sourceImage.height
    );

    const scale = Math.min(
      3,
      4500 / maxSide
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(sourceImage.width * scale);
    canvas.height = Math.round(sourceImage.height * scale);

    const context = canvas.getContext("2d");

    // 白黒化とコントラスト調整
    context.filter = "grayscale(1) contrast(1.5)";

    context.drawImage(
      sourceImage,
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.filter = "none";

    ocrStatus.textContent =
      "画像全体の文字を読み取っています。";

    // 画像全体をOCRで読み取る
    const result = await Tesseract.recognize(
      canvas,
      "jpn+eng"
    );

    const fullText = result.data.text || "";

    // 読み取った全文を表示
    ocrResult.value = fullText;

    console.log("OCR全文:", fullText);

    // 課題名を抽出
    const taskName = extractTaskName(fullText);

    // 授業名を抽出
    const className = extractClassName(fullText);

    // 提出期限を抽出
    const dueDate = extractDueDate(fullText);

    // 確認画面に反映
    document.getElementById("ocr-task-name").value =
      taskName;

    document.getElementById("ocr-class-name").value =
      className;

    document.getElementById("ocr-due-date").value =
      dueDate;

    // 読み取り結果を確認できるようにする
    document.getElementById("ocr-confirm").hidden = false;

    if (!taskName || !dueDate) {
      ocrStatus.textContent =
        "読み取りました。課題名や提出期限が空欄の場合は、手入力で補ってください。";
    } else {
      ocrStatus.textContent =
        "読み取りが完了しました。内容を確認してください。";
    }

    console.log("課題名:", taskName);
    console.log("授業名:", className);
    console.log("提出期限:", dueDate);

  } catch (error) {

    console.error("OCRエラー:", error);

    ocrStatus.textContent =
      "読み取りに失敗しました。画像を確認して、もう一度試してください。";

  } finally {

    readButton.disabled = false;

  }

});
// 写真から読み取った課題を登録する処理
const ocrRegisterButton = document.getElementById("ocr-register");

ocrRegisterButton.addEventListener("click", function() {

  const name = document.getElementById("ocr-task-name").value;
  const className = document.getElementById("ocr-class-name").value;
  const dueDate = document.getElementById("ocr-due-date").value;

  if (!name.trim()) {
    alert("課題名を入力してください。");
    return;
  }

  if (!dueDate) {
    alert("提出期限を入力してください。");
    return;
  }

  const task = {
    id: Date.now(),
    name: name,
    className: className,
    dueDate: dueDate,
    completed: false
  };

  tasks.push(task);

  saveTasks();
  displayTasks();

  document.getElementById("ocr-task-name").value = "";
  document.getElementById("ocr-class-name").value = "";
  document.getElementById("ocr-due-date").value = "";

  document.getElementById("ocr-confirm").hidden = true;

  alert("課題を登録しました。");
});

// Service Workerを登録する
if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker.register("./service-worker.js")

      .then(() => {
        console.log("Service Workerの登録に成功しました");
      })

      .catch(error => {
        console.error("Service Workerの登録に失敗しました", error);
      });
  });
}
