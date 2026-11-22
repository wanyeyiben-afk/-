
ファイル再ダウンロード対応 (3)
からの続き
"課題グループ",
        classNextLabels
      );

    // 課題名を専用の読み取り結果から取得
    let taskName = normalizeText(taskText);

    // 専用OCRで空欄なら、通常の読み取り結果から探す
    if (!taskName) {

      taskName =
ありがとうございます。ここは問題ありません。

// 課題名を専用の読み取り結果から取得
let taskName = normalizeText(taskText);

この箇所が、現在確認できている唯一の let taskName です。

ただし、エラーは重複宣言を示しています。別の場所で taskName が宣言されている可能性があります。

次に、もう1か所の taskName = を選択して、その前後5行程度を送ってください。

まだ変更しないでください。

let taskName = normalizeText(taskText);

    // 専用OCRで空欄なら、通常の読み取り結果から探す
    if (!taskName) {

      taskName =
        extractField(
          fullText,
          "課題名",
          [
            "課題公開期間",
原因が分かりました。ここではなく、もう一つの let taskName が同じ処理範囲内に残っている可能性があります。

ただ、今送ってもらったコードだけでは、どちらが重複しているか断定できません。

次は script.js 全体を確認させてください。

現在編集している script.js を、もう一度ファイルとして添付してください。

こちらで重複宣言を探し、ログイン機能やOCR機能を壊さないように、修正箇所を特定します。もう推測で削除させません。

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

// 写真を読み取る処理
// 写真を読み取る処理
// 写真を読み取る処理
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
  ocrStatus.textContent = "画像を読み取っています。";

  let sourceImage = null;

  try {

    // 元画像を読み込む
    sourceImage = await createImageBitmap(file);

    // 画像全体を読み取る
    const fullResult = await Tesseract.recognize(
      file,
      "jpn+eng"
    );

    const fullText = fullResult.data.text || "";

    // 画像上部を読み取る
    const upperHeight = Math.floor(
      sourceImage.height * 0.6
    );

    const upperCanvas = document.createElement("canvas");

    const upperScale = Math.min(
      4,
      5000 / sourceImage.width
    );

    upperCanvas.width = Math.round(
      sourceImage.width * upperScale
    );

    upperCanvas.height = Math.round(
      upperHeight * upperScale
    );

    const upperContext = upperCanvas.getContext("2d");

    upperContext.filter = "grayscale(1) contrast(1.5)";

    upperContext.drawImage(
      sourceImage,
      0,
      0,
      sourceImage.width,
      upperHeight,
      0,
      0,
      upperCanvas.width,
      upperCanvas.height
    );

    upperContext.filter = "none";

    const upperResult = await Tesseract.recognize(
      upperCanvas,
      "jpn+eng"
    );

    const upperText = upperResult.data.text || "";

   // 課題名の行だけを切り出す
const taskCanvas = document.createElement("canvas");

// 画像の2段目を切り出す
const cropX = 0;
const cropY = Math.floor(sourceImage.height * 0.114);
const cropWidth = sourceImage.width;
const cropHeight = Math.floor(sourceImage.height * 0.108);

// 文字を大きくする
const taskScale = Math.min(
  6,
  5500 / cropWidth
);

taskCanvas.width = Math.round(cropWidth * taskScale);
taskCanvas.height = Math.round(cropHeight * taskScale);

const taskContext = taskCanvas.getContext("2d");

taskContext.imageSmoothingEnabled = true;
taskContext.imageSmoothingQuality = "high";
taskContext.filter = "grayscale(1) contrast(1.8)";

taskContext.drawImage(
  sourceImage,
  cropX,
  cropY,
  cropWidth,
  cropHeight,
  0,
  0,
  taskCanvas.width,
  taskCanvas.height
);

taskContext.filter = "none";

ocrStatus.textContent =
  "課題名の行を詳しく読み取っています。";

// 1行の文字として認識させる
const taskResult = await Tesseract.recognize(
  taskCanvas,
  "jpn+eng",
  {
    tessedit_pageseg_mode: "7"
  }
);

console.log("元画像サイズ:", sourceImage.width, sourceImage.height);
console.log("切り出し範囲:", cropX, cropY, cropWidth, cropHeight);
console.log("切り出し後サイズ:", taskCanvas.width, taskCanvas.height);
const taskText = taskResult.data.text || "";

console.log("課題名専用OCR:", taskText);



    console.log("課題名専用OCR:", taskText);
    console.log("画像上部OCR:", upperText);
    console.log("画像全体OCR:", fullText);

    // 空白や改行を除去する
    function normalizeText(text) {
      return text.replace(/\s/g, "");
    }

    // 指定した項目の値を取り出す
    function extractField(text, label, nextLabels) {

      const normalized = normalizeText(text);

      const start = normalized.indexOf(label);

      if (start === -1) {
        return "";
      }

      const valueStart = start + label.length;

      let valueEnd = normalized.length;

      for (const nextLabel of nextLabels) {

        const nextIndex = normalized.indexOf(
          nextLabel,
          valueStart
        );

        if (
          nextIndex !== -1 &&
          nextIndex < valueEnd
        ) {
          valueEnd = nextIndex;
        }
      }

      return normalized
        .slice(valueStart, valueEnd)
        .replace(/^[：:]/, "")
        .trim();
    }

    // 授業名を取得
    const classNextLabels = [
      "課題名",
      "課題公開期間",
      "課題提出期間",
      "課題内容"
    ];

    const className =
      extractField(
        fullText,
        "課題グループ",
        classNextLabels
      ) ||
      extractField(
        upperText,
        "課題グループ",
        classNextLabels
      );

    // 課題名を専用の読み取り結果から取得
    let taskName = normalizeText(taskText);

    // 専用OCRで空欄なら、通常の読み取り結果から探す
    if (!taskName) {

      taskName =
        extractField(
          fullText,
          "課題名",
          [
            "課題公開期間",
            "課題提出期間",
            "課題内容"
          ]
        ) ||
        extractField(
          upperText,
          "課題名",
          [
            "課題公開期間",
            "課題提出期間",
            "課題内容"
          ]
        );
    }

    // 提出期間を取得
    const periodNextLabels = [
      "課題内容",
      "添付ファイル",
      "課題提出方法"
    ];

    const submissionPeriod =
      extractField(
        fullText,
        "課題提出期間",
        periodNextLabels
      ) ||
      extractField(
        upperText,
        "課題提出期間",
        periodNextLabels
      );

    // 提出期間の終了日時を取得
    const dateRegex =
      /(20\d{2})\/(\d{1,2})\/(\d{1,2})[^0-9]{0,12}(\d{1,2}):(\d{2})/g;

    const dateMatches = [
      ...submissionPeriod.matchAll(dateRegex)
    ];

    let dueDate = "";

    if (dateMatches.length >= 2) {

      const match = dateMatches[1];

      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      const hour = match[4].padStart(2, "0");
      const minute = match[5];

      dueDate =
        ${year}-${month}-${day}T${hour}:${minute};
    }

    // 読み取り結果を確認画面に反映
    document.getElementById("ocr-task-name").value =
      taskName;

    document.getElementById("ocr-class-name").value =
      className;

    document.getElementById("ocr-due-date").value =
      dueDate;

    document.getElementById("ocr-confirm").hidden = false;

    // 結果を表示
    ocrResult.value =
      "【課題名専用OCR】\n" +
      taskText +
      "\n\n【画像上部OCR】\n" +
      upperText +
      "\n\n【画像全体OCR】\n" +
      fullText;

    if (!taskName || !className || !dueDate) {

      ocrStatus.textContent =
        "一部読み取れませんでした。確認画面で修正してください。";

    } else {

      ocrStatus.textContent =
        "読み取りが完了しました。内容を確認してください。";

    }

    console.log("授業名:", className);
    console.log("課題名:", taskName);
    console.log("提出期限:", dueDate);

  } catch (error) {

    console.error("OCRエラー:", error);

    ocrStatus.textContent =
      "読み取りに失敗しました。もう一度試してください。";

  } finally {

    if (sourceImage) {
      sourceImage.close();
    }

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






