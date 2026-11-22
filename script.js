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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

let unsubscribeTasks = null;

// HTMLの要素
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const userStatus = document.getElementById("user-status");

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const imageInput = document.getElementById("task-image");
const imagePreview = document.getElementById("image-preview");
const readButton = document.getElementById("read-image");
const ocrStatus = document.getElementById("ocr-status");
const ocrResult = document.getElementById("ocr-result");
const ocrRegisterButton = document.getElementById("ocr-register");

// 保存されている課題を読み込む
let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem("tasks")) || [];
} catch (error) {
  tasks = [];
}

// 課題を保存する
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

    for (const task of tasks) {
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

    await deleteDoc(
      doc(
        db,
        "users",
        auth.currentUser.uid,
        "tasks",
        String(taskId)
      )
    );
  } catch (error) {
    console.error("Firestore削除エラー:", error);
  }
}

// Firestore同期
function startTasksSync() {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;

  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  let isFirstSnapshot = true;

  unsubscribeTasks = onSnapshot(
    collection(db, "users", userId, "tasks"),
    async (snapshot) => {
      if (isFirstSnapshot && snapshot.metadata.fromCache) {
        displayTasks();
        return;
      }

      if (isFirstSnapshot) {
        isFirstSnapshot = false;

        if (snapshot.empty && tasks.length > 0) {
          await saveTasksToFirestore();
          return;
        }
      }

      tasks = snapshot.docs.map(item => item.data());

      localStorage.setItem("tasks", JSON.stringify(tasks));
      displayTasks();
    },
    (error) => {
      console.error("同期エラー:", error);
    }
  );
}

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

// ログイン状態
onAuthStateChanged(auth, (user) => {
  if (user) {
    userStatus.textContent = user.displayName + " でログイン中";
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";
    startTasksSync();
  } else {
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }

    userStatus.textContent = "ログインしていません";
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
  }
});

// 課題登録
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("task-name").value;
  const className = document.getElementById("class-name").value;
  const dueDate = document.getElementById("due-date").value;

  tasks.push({
    id: Date.now(),
    name,
    className,
    dueDate,
    completed: false
  });

  saveTasks();
  displayTasks();
  taskForm.reset();
});

// 課題一覧表示
function displayTasks() {
  taskList.innerHTML = "";

  const sortedTasks = [...tasks].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );

  sortedTasks.forEach((task) => {
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

    const completeButton = document.createElement("button");
    completeButton.textContent =
      task.completed ? "未提出に戻す" : "提出済みにする";

    completeButton.addEventListener("click", () => {
      task.completed = !task.completed;
      saveTasks();
      displayTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      deleteTaskFromFirestore(task.id);
      saveTasks();
      displayTasks();
    });

    const editButton = document.createElement("button");
    editButton.textContent = "編集";

    editButton.addEventListener("click", () => {
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

      if (
        newName.trim() === "" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)
      ) {
        alert("課題名または締め切りの日付を確認してください。");
        return;
      }

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

  document.getElementById("remaining-count").textContent =
    tasks.filter(t => !t.completed).length;

  document.getElementById("completed-count").textContent =
    tasks.filter(t => t.completed).length;

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

// 初回表示
displayTasks();

// 画像プレビュー
imageInput.addEventListener("change", () => {
  imagePreview.innerHTML = "";

  const file = imageInput.files[0];
  if (!file) return;

  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  imagePreview.appendChild(image);
});

// OCR文字の整形
function normalizeText(text) {
  return text.replace(/\s/g, "");
}

// OCR項目抽出
function extractField(text, label, nextLabels) {
  const normalized = normalizeText(text);
  const start = normalized.indexOf(label);

  if (start === -1) return "";

  const valueStart = start + label.length;
  let valueEnd = normalized.length;

  for (const nextLabel of nextLabels) {
    const nextIndex = normalized.indexOf(nextLabel, valueStart);

    if (nextIndex !== -1 && nextIndex < valueEnd) {
      valueEnd = nextIndex;
    }
  }

  return normalized
    .slice(valueStart, valueEnd)
    .replace(/^[：:]/, "")
    .trim();
}

// OCR実行
readButton.addEventListener("click", async () => {
  const file = imageInput.files[0];

  if (!file) {
    alert("先に写真を選択してください。");
    return;
  }

  if (!window.Tesseract) {
    ocrStatus.textContent = "文字読み取り機能を読み込めませんでした。";
    return;
  }

  readButton.disabled = true;
  ocrStatus.textContent = "画像を読み取っています。";

  let sourceImage = null;

  try {
    sourceImage = await createImageBitmap(file);

    const fullResult = await Tesseract.recognize(file, "jpn+eng");
    const fullText = fullResult.data.text || "";

    const upperHeight = Math.floor(sourceImage.height * 0.6);
    const upperCanvas = document.createElement("canvas");
    const upperScale = Math.min(4, 5000 / sourceImage.width);

    upperCanvas.width = Math.round(sourceImage.width * upperScale);
    upperCanvas.height = Math.round(upperHeight * upperScale);

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

    const cropY = Math.floor(sourceImage.height * 0.114);
    const cropHeight = Math.floor(sourceImage.height * 0.108);
    const taskCanvas = document.createElement("canvas");
    const taskScale = Math.min(6, 5500 / sourceImage.width);

    taskCanvas.width = Math.round(sourceImage.width * taskScale);
    taskCanvas.height = Math.round(cropHeight * taskScale);

    const taskContext = taskCanvas.getContext("2d");
    taskContext.imageSmoothingEnabled = true;
    taskContext.imageSmoothingQuality = "high";
    taskContext.filter = "grayscale(1) contrast(1.8)";

    taskContext.drawImage(
      sourceImage,
      0,
      cropY,
      sourceImage.width,
      cropHeight,
      0,
      0,
      taskCanvas.width,
      taskCanvas.height
    );

    taskContext.filter = "none";

    const taskResult = await Tesseract.recognize(
      taskCanvas,
      "jpn+eng",
      { tessedit_pageseg_mode: "7" }
    );

    const taskText = taskResult.data.text || "";

    const classNextLabels = [
      "課題名",
      "課題公開期間",
      "課題提出期間",
      "課題内容"
    ];

    const className =
      extractField(fullText, "課題グループ", classNextLabels) ||
      extractField(upperText, "課題グループ", classNextLabels);

    let taskName = normalizeText(taskText);

    if (!taskName) {
      taskName =
        extractField(fullText, "課題名", [
          "課題公開期間",
          "課題提出期間",
          "課題内容"
        ]) ||
        extractField(upperText, "課題名", [
          "課題公開期間",
          "課題提出期間",
          "課題内容"
        ]);
    }

    const periodNextLabels = [
      "課題内容",
      "添付ファイル",
      "課題提出方法"
    ];

    const submissionPeriod =
      extractField(fullText, "課題提出期間", periodNextLabels) ||
      extractField(upperText, "課題提出期間", periodNextLabels);

    const dateRegex =
      /(20\d{2})\/(\d{1,2})\/(\d{1,2})[^0-9]{0,12}(\d{1,2}):(\d{2})/g;

    const dateMatches = [...submissionPeriod.matchAll(dateRegex)];

    let dueDate = "";

    if (dateMatches.length >= 2) {
      const match = dateMatches[1];

      dueDate =
        `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T${match[4].padStart(2, "0")}:${match[5]}`;
    }

    document.getElementById("ocr-task-name").value = taskName;
    document.getElementById("ocr-class-name").value = className;
    document.getElementById("ocr-due-date").value = dueDate;
    document.getElementById("ocr-confirm").hidden = false;

    ocrResult.value =
      "【課題名専用OCR】\n" + taskText +
      "\n\n【画像上部OCR】\n" + upperText +
      "\n\n【画像全体OCR】\n" + fullText;

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
    ocrStatus.textContent = "読み取りに失敗しました。もう一度試してください。";
  } finally {
    if (sourceImage) sourceImage.close();
    readButton.disabled = false;
  }
});

// OCR結果から課題を登録
ocrRegisterButton.addEventListener("click", () => {
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

  tasks.push({
    id: Date.now(),
    name,
    className,
    dueDate,
    completed: false
  });

  saveTasks();
  displayTasks();

  document.getElementById("ocr-task-name").value = "";
  document.getElementById("ocr-class-name").value = "";
  document.getElementById("ocr-due-date").value = "";
  document.getElementById("ocr-confirm").hidden = true;

  alert("課題を登録しました。");
});

// Service Worker
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
