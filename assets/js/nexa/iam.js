class Iam {
  constructor() {
  }

  async init() {
    await this.loadSiteConfig();
    await this.renderButtons();
  }

  async loadSiteConfig() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    const iamElements = document.querySelectorAll("[data-iam]");

    if (!iamElements.length || !this.config?.hero) return;

    iamElements.forEach((el) => {
      const prop = el.getAttribute("data-iam");
      if (prop && this.config.hero[prop]) {
        el.textContent = this.config.hero[prop];
      }
    });
  }

  async renderButtons() {
    const placeholders = document.querySelectorAll("[data-btn-placeholder]");
    placeholders.forEach((placeholder) => {
      const btnIndices = placeholder.getAttribute("data-btn-placeholder").split(",").map(Number);
      const type = placeholder.getAttribute("type");
      const buttons = this.config?.hero?.buttons || [];
      const btnContainer = window.App.modules.util.createElement("div");
      btnContainer.className = "btn-container";
      btnIndices.forEach((index) => {
        if (buttons[index]) {
          const button = buttons[index];
          if (button.child && button.child.length > 0) {
            const dropdownWrapper = window.App.modules.util.createDropdownButton(button, type);
            const mainBtn = dropdownWrapper && dropdownWrapper.querySelector("[data-selected-value]");
            if (mainBtn) {
              const mainBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const selectedValue = e.target.getAttribute("data-selected-value");
                if (selectedValue) {
                  this.handleButtonAction(button.rel, selectedValue);
                }
              };
              mainBtn.addEventListener("click", mainBtnHandler);
              btnContainer.appendChild(dropdownWrapper);
            }
          } else {
            const btn = window.App.modules.util.createSimpleButton(button, type);
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              this.handleButtonAction(button.rel);
            });
            btnContainer.appendChild(btn);
          }
        }
      });
      placeholder.parentNode.replaceChild(btnContainer, placeholder);
    });
  }

  async handleButtonAction(rel, childText) {
    switch (rel) {
      case "portfolio":
        window.App.modules.util.share('Share Portfolio');
        break;
      case "resume":
        await this.downloadResume(childText);
        break;
      default:
    }
  }

  generateResumeHTML(data) {
    return `
    <div class="header">
      <div class="name">${data.personal.name}</div>
      <div class="title">${data.personal.title}</div>
      ${data.personal.subtitle ? `<div class="subtitle">${data.personal.subtitle}</div>` : ""}
      ${data.personal.tagline ? `<div class="tagline">${data.personal.tagline}</div>` : ""}
      <div class="contact">
        <span class="contact-item">📧 ${data.personal.email}</span> | 
        <span class="contact-item">📱 ${data.personal.phone}</span> | 
        <span class="contact-item">📍 ${data.personal.location}</span> | 
        ${data.personal.linkedin ? `<span class="contact-item">💼 ${data.personal.linkedin}</span> | ` : ""}
        ${data.personal.github ? `<span class="contact-item">🔗 ${data.personal.github}</span> | ` : ""}
        ${data.personal.website ? `<span class="contact-item">🌐 ${data.personal.website}</span> | ` : ""}
      </div>
    </div>
    ${
      data.objective
        ? `
      <div class="section">
        <div class="section-title">Objective</div>
        <div class="objective">${data.objective}</div>
      </div>
    `
        : ""
    }
    <div class="section">
      <div class="section-title">Professional Summary</div>
      <div class="summary">${data.summary}</div>
    </div>
    ${
      data.keyStrengths && data.keyStrengths.length > 0
        ? `
      <div class="section">
        <div class="section-title">Key Strengths</div>
        <ul class="key-strengths">
          ${data.keyStrengths.map((strength) => `<li>${strength}</li>`).join("")}
        </ul>
      </div>
    `
        : ""
    }
    <div class="section">
      <div class="section-title">Professional Experience</div>
      ${data.experience
        .map(
          (job) => `
        <div class="job">
          <div class="job-header">
            <div class="job-title">${job.title}</div>
            <div class="job-company">${job.company}${job.client ? ` (Client: ${job.client})` : ""}</div>
            <div class="job-meta">
              <span>${job.location}</span>
              <span class="separator">|</span>
              <span>${job.period}</span>
              ${job.duration ? `<span class="separator">|</span><span>${job.duration}</span>` : ""}
            </div>
            ${job.project ? `<div class="job-project"><strong>Project:</strong> ${job.project}</div>` : ""}
            ${job.teamSize ? `<div class="job-team"><strong>Team Size:</strong> ${job.teamSize}</div>` : ""}
            ${job.environment ? `<div class="job-environment"><strong>Environment:</strong> ${job.environment}</div>` : ""}
            ${job.description ? `<div class="job-description">${job.description}</div>` : ""}
          </div>
          ${
            job.achievements && job.achievements.length > 0
              ? `
            <div class="achievements-title">Key Achievements:</div>
            <ul class="achievements">
              ${job.achievements.map((achievement) => `<li>${achievement}</li>`).join("")}
            </ul>
          `
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>

    <div class="section">
      <div class="section-title">Education</div>
        <div class="grid">
        ${data.education
          .map(
            (edu) => `
          <div class="education-item">
            <div class="degree">${edu.degree}</div>
            <div class="school">${edu.school}</div>
            <div class="education-meta">${edu.location} | ${edu.year}${edu.score ? ` | Score: ${edu.score}` : ""}</div>
          </div>
        `
          )
          .join("")}
        </div>
      </div>
    <div class="section">
      <div class="section-title">Technical Skills</div>
      <div class="skills-grid">
        ${Object.entries(data.skills)
          .map(
            ([category, skills]) => `
          <div class="skill-category">
            <div class="skill-name">${category}</div>
            <div class="skill-list">${Array.isArray(skills) ? skills.join(" • ") : skills}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    ${
      data.achievements && data.achievements.length > 0
        ? `
      <div class="section">
        <div class="section-title">Awards & Recognition</div>
          <div class="grid">
        ${data.achievements
          .map(
            (achievement) => `
              <div class="achievement-item">
                <div class="achievement-title">🏆 ${achievement.title}</div>
                <div class="achievement-desc">${achievement.description}</div>
                ${achievement.issuer ? `<div class="achievement-issuer"><em>${achievement.issuer}</em></div>` : ""}
              </div>
            `
          )
          .join("")}
        </div>
      </div>
    `
        : ""
    }

    ${
      data.personalDetails
        ? `
      <div class="section">
        <div class="section-title">Personal Details</div>
        <div class="personal-details">
          ${data.personalDetails.dateOfBirth ? `<div class="detail-item"><strong>Date of Birth:</strong> ${data.personalDetails.dateOfBirth}</div>` : ""}
          ${data.personalDetails.maritalStatus ? `<div class="detail-item"><strong>Marital Status:</strong> ${data.personalDetails.maritalStatus}</div>` : ""}
          ${data.personalDetails.fatherName ? `<div class="detail-item"><strong>Father's Name:</strong> ${data.personalDetails.fatherName}</div>` : ""}
          ${data.personalDetails.nationality ? `<div class="detail-item"><strong>Nationality:</strong> ${data.personalDetails.nationality}</div>` : ""}
          ${data.personalDetails.passport ? `<div class="detail-item"><strong>Passport:</strong> ${data.personalDetails.passport}</div>` : ""}
        </div>
      </div>
    `
        : ""
    }
  `;
  }

  generatePDF(data) {
    const printWindow = window.open("", "_blank");
    const html = this.generateResumeHTML(data);

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.personal.name} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', 'Calibri', Arial, sans-serif; 
          line-height: 1.5; 
          color: #333;
          padding: 30px;
          max-width: 900px;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          margin-bottom: 25px;
          padding-bottom: 18px;
          border-bottom: 3px solid #2563eb;
        }
        .name { 
          font-size: 30px; 
          font-weight: 700; 
          color: #1e40af;
          margin-bottom: 5px;
        }
        .title { 
          font-size: 16px; 
          color: #64748b;
          font-weight: 600;
          margin-bottom: 3px;
        }
        .subtitle {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
          margin-bottom: 3px;
        }
        .tagline {
          font-size: 13px;
          color: #94a3b8;
          font-style: italic;
          margin-bottom: 10px;
        }
        .contact { 
          display: flex; 
          justify-content: center; 
          flex-wrap: wrap; 
          gap: 12px;
          font-size: 12px;
          color: #475569;
        }
        .contact-item { 
          display: inline-flex; 
          align-items: center; 
          gap: 3px;
        }
        .section { 
          margin-bottom: 22px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 17px; 
          font-weight: 700; 
          color: #1e40af;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid{
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }
        .objective {
          font-size: 13px;
          line-height: 1.6;
          color: #475569;
          text-align: justify;
          font-style: italic;
        }
        .summary { 
          font-size: 13px; 
          line-height: 1.6; 
          color: #475569;
          text-align: justify;
        }
        .key-strengths {
          padding-left: 20px;
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
        }
        .key-strengths li {
          margin-bottom: 5px;
        }
        .job { 
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        .job-header { 
          margin-bottom: 8px; 
        }
        .job-title { 
          font-size: 15px; 
          font-weight: 600; 
          color: #1e293b;
          margin-bottom: 2px;
        }
        .job-company { 
          font-size: 13px; 
          color: #2563eb;
          font-weight: 500;
          margin-top: 2px;
        }
        .job-meta { 
          font-size: 12px; 
          color: #64748b;
          margin-top: 3px;
        }
        .separator {
          margin: 0 5px;
        }
        .job-project, .job-team {
          font-size: 12px;
          color: #059669;
          margin-top: 3px;
        }
        .job-environment {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
          line-height: 1.5;
        }
        .job-description {
          font-size: 12px;
          color: #475569;
          margin-top: 5px;
          line-height: 1.5;
        }
        .achievements-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-top: 8px;
          margin-bottom: 5px;
        }
        .achievements { 
          margin-top: 8px; 
          padding-left: 20px;
        }
        .achievements li { 
          margin-bottom: 5px;
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
        }
        .education-item { 
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        .degree { 
          font-size: 14px; 
          font-weight: 600; 
          color: #1e293b;
        }
        .school { 
          font-size: 12px; 
          color: #2563eb;
          font-weight: 500;
          margin-top: 2px;
        }
        .education-meta { 
          font-size: 11px; 
          color: #64748b;
          margin-top: 3px;
        }
        .skills-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 10px;
        }
        .skill-category { 
          background: #f8fafc;
          padding: 10px;
          border-radius: 5px;
          border-left: 3px solid #2563eb;
          page-break-inside: avoid;
        }
        .skill-name { 
          font-size: 13px; 
          font-weight: 600; 
          color: #1e293b;
          margin-bottom: 5px;
        }
        .skill-list { 
          font-size: 11px; 
          color: #475569;
          line-height: 1.5;
        }
        .achievement-item {
          margin-bottom: 10px;
          padding: 8px;
          background: #f0f9ff;
          border-radius: 5px;
          border-left: 3px solid #3b82f6;
          page-break-inside: avoid;
        }
        .achievement-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 3px;
        }
        .achievement-desc {
          font-size: 11px;
          color: #475569;
          line-height: 1.4;
          margin-bottom: 2px;
        }
        .achievement-issuer {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        .personal-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }
        .detail-item {
          line-height: 1.5;
        }
        @media print {
          body { padding: 15px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 1000);
    }, 250);
  }

  generateDOCX(data) {
    const html = this.generateResumeHTML(data);

    const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${data.personal.name} - Resume</title>
      <style>
        body { 
          font-family: Calibri, Arial, sans-serif; 
          line-height: 1.5; 
          color: #333;
          padding: 30px;
        }
        .header { 
          text-align: center; 
          margin-bottom: 25px;
          padding-bottom: 18px;
          border-bottom: 3px solid #2563eb;
        }
        .name { 
          font-size: 24pt; 
          font-weight: bold; 
          color: #1e40af;
          margin-bottom: 5px;
        }
        .title { 
          font-size: 12pt; 
          color: #64748b;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .subtitle {
          font-size: 11pt;
          color: #475569;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .tagline {
          font-size: 10pt;
          color: #94a3b8;
          font-style: italic;
          margin-bottom: 10px;
        }
        .contact { 
          font-size: 9pt;
          color: #475569;
          line-height: 1.6;
        }
        .section { 
          margin-bottom: 22px; 
        }
        .section-title { 
          font-size: 13pt; 
          font-weight: bold; 
          color: #1e40af;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
        }
        .grid{
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }
        .objective {
          font-size: 10pt;
          line-height: 1.5;
          color: #475569;
          font-style: italic;
        }
        .summary { 
          font-size: 10pt; 
          line-height: 1.5; 
          color: #475569;
        }
        .key-strengths {
          padding-left: 20px;
          font-size: 9pt;
          color: #475569;
        }
        .key-strengths li {
          margin-bottom: 5px;
        }
        .job { 
          margin-bottom: 18px;
        }
        .job-title { 
          font-size: 11pt; 
          font-weight: bold; 
          color: #1e293b;
        }
        .job-company { 
          font-size: 10pt; 
          color: #2563eb;
          font-weight: bold;
        }
        .job-meta { 
          font-size: 9pt; 
          color: #64748b;
        }
        .job-project, .job-team {
          font-size: 9pt;
          color: #059669;
          font-weight: bold;
        }
        .job-environment {
          font-size: 8pt;
          color: #64748b;
          line-height: 1.4;
        }
        .job-description {
          font-size: 9pt;
          color: #475569;
        }
        .achievements-title {
          font-size: 10pt;
          font-weight: bold;
          color: #1e293b;
          margin-top: 8px;
        }
        .achievements li { 
          margin-bottom: 5px;
          font-size: 9pt;
          color: #475569;
        }
        .degree { 
          font-size: 10pt; 
          font-weight: bold; 
          color: #1e293b;
        }
        .school { 
          font-size: 9pt; 
          color: #2563eb;
          font-weight: bold;
        }
        .education-meta {
          font-size: 8pt;
          color: #64748b;
        }
        .skill-category { 
          margin-bottom: 10px;
        }
        .skill-name { 
          font-size: 10pt; 
          font-weight: bold; 
          color: #1e293b;
        }
        .skill-list { 
          font-size: 9pt; 
          color: #475569;
        }
        .achievement-item {
          margin-bottom: 10px;
        }
        .achievement-title {
          font-size: 10pt;
          font-weight: bold;
          color: #1e293b;
        }
        .achievement-desc {
          font-size: 9pt;
          color: #475569;
        }
        .achievement-issuer {
          font-size: 8pt;
          color: #64748b;
        }
        .personal-details {
          font-size: 9pt;
          color: #475569;
        }
        .detail-item {
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `;

    const blob = new Blob(["\ufeff", docContent], {
      type: "application/msword",
    });

    const url = URL.createObjectURL(blob);
    const link = window.App.modules.util.createElement("a");
    link.href = url;
    link.download = `${data.personal.name.replace(/ /g, "_")}_Resume.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async downloadResume(format) {
    try {
      const resumeData = await window.App.modules.apiClient.loadJSON("/data/resume-data.json");
      if (format === "PDF") {
        this.generatePDF(resumeData);
      } else if (format === "DOCX") {
        this.generateDOCX(resumeData);
      }
    } catch (error) {
      console.error("Error loading resume data:", error);
      alert("Failed to generate resume. Please try again.");
    }
  }

  cleanup() {
    const btnContainers = document.querySelectorAll(".btn-container");
    btnContainers.forEach((container) => {
      container.remove();
    });
    this.config = null;
    const iamElements = document.querySelectorAll("[data-iam]");
    iamElements.forEach((el) => (el.textContent = ""));
  }
}

function initIam() {
  if (window.App?.modules?.iam) {
    window.App.modules.iam.cleanup?.();
  }
  const iamModule = new Iam();
  window.App.register("iam", iamModule, "initIam");
  iamModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIam);
} else {
  initIam();
}

export { Iam, initIam };
