/* =========================
      基本ユーティリティ
    ========================= */

    const $ = (id)=>document.getElementById(id);

    function isISODate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||"")}
    function todayISO(){return new Date().toISOString().slice(0,10)}
    function fmtJPDate(iso){return isISODate(iso)?iso.replaceAll("-","/"):""}
    function normalizeNumber(str){
      if(!str) return "";
      return str.replace(/[０-９]/g,s=>String.fromCharCode(s.charCodeAt(0)-0xFEE0)).replace(/[^\d]/g,"");
    }
    function formatYen(n){
      if(!n) return "";
      return Number(n).toLocaleString("ja-JP")+" 円";
    }
    function showToast(t){
      let el=$("toast");
      if(!el){
        el=document.createElement("div");
        el.id="toast";
        el.className="toast";
        document.body.appendChild(el);
      }
      el.textContent=t;
      el.classList.add("show");
      setTimeout(()=>el.classList.remove("show"),1500);
    }

    /* =========================
      プロフィール（自社）
    ========================= */

    const PROFILE_KEY="techProfile_v2";

    function loadProfile(){
      try{
        return JSON.parse(localStorage.getItem(PROFILE_KEY))||{myCompany:{}}
      }catch(e){return {myCompany:{}}}
    }
    function saveProfile(p){
      localStorage.setItem(PROFILE_KEY,JSON.stringify(p))
    }
    function fillProfileUI(){
      const p=loadProfile().myCompany||{}
      $("myName").value=p.name||"";
      $("myAddress").value=p.address||"";
      $("myPermitNo").value=p.permitNo||"";
      $("myPermitUntil").value=p.permitUntil||"";
    }
    function readProfileUI(){
      return{
        myCompany:{
          name:$("myName").value.trim(),
          address:$("myAddress").value.trim(),
          permitNo:$("myPermitNo").value.trim(),
          permitUntil:$("myPermitUntil").value.trim()
        }
      }
    }

    /* =========================
      state
    ========================= */

    const state={
      view:"home",
      case:{projectName:"",partnerName:"",startDate:"",endDate:""},
    };

    /* =========================
      ヘッダー
    ========================= */

    function currentProjectLabel(){
      return state.case.projectName||"（工事未選択）"
    }
    function setBreadcrumb(parts){
      $("hdrCrumb").textContent=parts.join(" > ");
    }
    function updateHeader(){
      $("hdrProject").textContent=currentProjectLabel();
      if(state.view==="home"){
        setBreadcrumb(["入口"]);
      }else if(state.view==="edit"){
        setBreadcrumb(["入口",`工事（${currentProjectLabel()}）`]);
      }else if(state.view==="daichoPreview"){
        setBreadcrumb(["入口",`工事（${currentProjectLabel()}）`,"施工体制台帳"]);
      }
    }

    /* =========================
      画面切替
    ========================= */

    function goHome(){
      state.view="home";
      $("homeView").style.display="";
      $("editView").style.display="none";
      $("daichoPreviewView").style.display="none";
      updateHeader();
    }
    function goEdit(){
      state.view="edit";
      $("homeView").style.display="none";
      $("editView").style.display="";
      $("daichoPreviewView").style.display="none";
      updateHeader();
    }
    function goDaichoPreview(){
      state.view="daichoPreview";
      $("homeView").style.display="none";
      $("editView").style.display="none";
      $("daichoPreviewView").style.display="";
      updateHeader();
    }

    /* =========================
      設定パネル（右スライド）
    ========================= */

    function openSettings(){
      fillProfileUI();
      $("settingsOverlay").style.display="";
      $("settingsPanel").style.display="";
    }
    function closeSettings(){
      $("settingsOverlay").style.display="none";
      $("settingsPanel").style.display="none";
    }

    /* =========================
      ボタン
    ========================= */

    function setupButtons() {
      const el = (id) => document.getElementById(id);
      const onClick = (id, fn) => {
        const n = el(id);
        if (!n) return;          // ← 無ければ何もしない（落ちない）
        n.onclick = fn;
      };

      const openFile = () => el("fileLoad")?.click();

      // Home
      onClick("homeNew", () => { resetCase(); goEdit(); });
      onClick("homeOpen", openFile);

      // ※HomeにhomeSettingsボタンを残している場合だけ
      onClick("homeSettings", () => openSettings());

      // Edit
      onClick("backHome", () => goHome());
      onClick("btnSave", () => { /* 既存の保存処理をここに */ });

      onClick("btnAdd", () => addEngineer({
        assignStart: state.case.startDate || "",
        assignEnd: state.case.endDate || "",
      }));

      // Edit → 設定（右スライド）
      onClick("btnOpenSettingsFromEdit", () => openSettings());

      // 台帳
      onClick("btnDaichoPreview", () => goDaichoPreview());
      onClick("btnBackToEdit", () => { document.getElementById("daichoPreviewView").style.display="none"; goEdit(); });
      onClick("btnPrintDaicho", () => window.print());

    }


    /* =========================
      起動
    ========================= */

    setupButtons();
    goHome();
    updateHeader();
