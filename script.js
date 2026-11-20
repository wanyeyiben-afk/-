
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
}

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

    const completeButton = document.createElement("button");
    completeButton.textContent =
      task.completed ? "未提出に戻す" : "提出済みにする";

    completeButton.addEventListener("click", function() {
      task.completed = !task.completed;
      saveTasks();
      displayTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", function() {
      tasks = tasks.filter(function(t) {
        return t.id !== task.id;
      });

      saveTasks();
      displayTasks();
    });
    // 編集ボタンを作る
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
    "文字を読み取っています。少しお待ちください。";

  try {
    // 画像全体を読み取る
    const result = await Tesseract.recognize(file, "jpn+eng");

    ocrResult.value = result.data.text;

   
    // 課題名と提出期限を読み取る

    const sourceImage = await createImageBitmap(file);

    // 「課題提出期間」がある行を探す
    const targetLine = result.data.lines.find(line =>
      line.text.replace(/\s/g, "").includes("課題提出期間")
    );

    if (!targetLine) {
      throw new Error("課題提出期間の行が見つかりませんでした。");
    }

    // 該当行の上下を少し広めに切り取る
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const margin = 20;
    const cropY = Math.max(0, targetLine.bbox.y0 - margin);
    const cropHeight = Math.min(
      sourceImage.height - cropY,
      targetLine.bbox.y1 - targetLine.bbox.y0 + margin * 2
    );

    canvas.width = sourceImage.width * 2;
    canvas.height = cropHeight * 2;

    context.drawImage(
      sourceImage,
      0,
      cropY,
      sourceImage.width,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // 切り取った行をもう一度読み取る
    const headerResult = await Tesseract.recognize(
      canvas,
      "jpn+eng"
    );

    const headerText = headerResult.data.text;
    const normalizedText = headerText.replace(/\s/g, "");

    console.log("課題名・提出期間の読み取り結果：", headerText);

    // 課題提出期間の位置を探す
    const label = "課題提出期間";
    const labelIndex = normalizedText.indexOf(label);

    if (labelIndex === -1) {
      throw new Error("課題提出期間を認識できませんでした。");
    }

    // 課題名を取り出す
    const afterLabel = normalizedText.slice(
      labelIndex + label.length
    );

    const dateStart = afterLabel.search(/20\d{2}\/\d{1,2}\/\d{1,2}/);

    let extractedTaskName = "";

    if (dateStart !== -1) {
      extractedTaskName = afterLabel
        .slice(0, dateStart)
        .replace(/[：:]/g, "")
        .trim();
    }

    document.getElementById("ocr-task-name").value =
      extractedTaskName;

    document.getElementById("ocr-class-name").value = "";

    // 提出期間の日付を取り出す
    const dateRegex =
      /(20\d{2})\/(\d{1,2})\/(\d{1,2})[（(][^）)]*[）)](\d{1,2}):(\d{2})/g;

    const dateMatches = [...afterLabel.matchAll(dateRegex)];

    console.log("提出期間の日付：", dateMatches);

    if (dateMatches.length >= 2) {
      // 2つ目の日付が提出期間の終了日時
      const match = dateMatches[1];

      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      const hour = match[4].padStart(2, "0");
      const minute = match[5];

      document.getElementById("ocr-due-date").value =
        `${year}-${month}-${day}T${hour}:${minute}`;

    } else {
      document.getElementById("ocr-due-date").value = "";
    }

    // 確認画面を表示する
    document.getElementById("ocr-confirm").hidden = false;

    ocrStatus.textContent =
      "読み取りが完了しました。内容を確認してください。";

  } catch (error) {
    ocrStatus.textContent =
      "読み取りに失敗しました。別の写真で試してください。";

    console.error(error);

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