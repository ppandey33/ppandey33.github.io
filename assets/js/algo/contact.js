import { HideComponent } from "../hide-component.js";

class Contacts extends HideComponent {
  constructor() {
    super({ currentPath: "/contact" });
    this.config = null;
    this.form = null;
    this.formButton = null;
    this.formStatus = null;
  }

  async init() {
    await this.loadContacts();
  }

  async loadContacts() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config?.contacts) return;
    this.config = this.config?.contacts;
    this.renderContactInfo();
    this.renderContactDetails();
    this.manageDOM();
    !this.isHome && this.renderContactForm();
  }

  renderContactInfo() {
    const containerInfo = document.querySelector("[data-contacts-info]");
    if (!containerInfo) return;

    containerInfo.innerHTML = "";
    const heading = window.App.modules.util.createElement("h2", "contacts-title", this.config.title);
    const desc = window.App.modules.util.createElement("p", "contacts-description", this.config.description);

    containerInfo.appendChild(heading);
    containerInfo.appendChild(desc);
  }

  renderContactDetails() {
    const container = document.querySelector("[data-contacts]");
    if (!container || !this.config?.details) return;

    container.innerHTML = "";
    this.config.details.forEach((contact) => {
      const contactItem = window.App.modules.util.createElement("div", "contact-item"),
        icon = window.App.modules.util.createElement("i", `icon ${contact?.class || ""}`);
      icon.innerHTML = contact.icon;
      let value;
      if (contact?.link) {
        value = window.App.modules.util.createElement("a", "contact-value", contact.value);
        value.href = contact.link || "#";
        value.setAttribute("target", "_blank");
      } else {
        value = window.App.modules.util.createElement("span", "contact-value", contact?.value);
      }

      contactItem.appendChild(icon);
      contactItem.appendChild(value);
      container.appendChild(contactItem);
    });
  }

  renderContactForm() {
    const formContainer = document.querySelector("[data-contact-form]");
    if (!formContainer || !this.config?.contact) return;
    formContainer.innerHTML = "";
    const contactConfig = this.config.contact;
    const wrapper = window.App.modules.util.createElement("div", "contact-form-wrapper fade-up");
    const header = window.App.modules.util.createElement("div", "contact-form-header fade-up");
    const title = window.App.modules.util.createElement("h3", "contact-form-title", contactConfig.title || "Send me a message");
    const subtitle = window.App.modules.util.createElement("p", "contact-form-subtitle", contactConfig["sub-title"] || "I'll get back to you as soon as possible");
    header.appendChild(title);
    header.appendChild(subtitle);

    const form = window.App.modules.util.createElement("form", "contact-form");
    form.setAttribute('autocomplete', 'off');
    form.id = "contact-form";

    if (contactConfig.group && Array.isArray(contactConfig.group)) {
      contactConfig.group.forEach((field) => {
        let fieldGroup;
        if (field.type === "textarea") {
          fieldGroup = this.createTextareaGroup(field);
        } else {
          fieldGroup = this.createFormGroup(field);
        }
        form.appendChild(fieldGroup);
      });
    }
    const formActions = window.App.modules.util.createElement("div", "form-actions");
    if (contactConfig.buttons && Array.isArray(contactConfig.buttons)) {
      contactConfig.buttons.forEach((btn) => {
        const button = this.createButton(btn);
        formActions.appendChild(button);
      });
    }
    form.appendChild(formActions);
    const status = window.App.modules.util.createElement("div", "form-status");
    status.id = "contact-form-status";
    form.appendChild(status);
    wrapper.appendChild(header);
    wrapper.appendChild(form);
    formContainer.appendChild(wrapper);
    this.setupFormHandler();
  }

  createFormGroup(field) {
    const group = window.App.modules.util.createElement("div", "form-group");
    const label = window.App.modules.util.createElement("label", "form-label");
    label.htmlFor = field.id;

    const labelSpan = window.App.modules.util.createElement("span", "label-text", field.label);
    label.appendChild(labelSpan);

    if (field.required) {
      const requiredSpan = window.App.modules.util.createElement("span", "label-required", "*");
      label.appendChild(requiredSpan);
    }
    const inputWrapper = window.App.modules.util.createElement("div", "input-wrapper");
    const icon = window.App.modules.util.createElement("i", `input-icon ${field.class || ""}`);
    icon.innerHTML = field.icon || "";
    const input = window.App.modules.util.createElement("input", "form-input");
    input.type = field.type || "text";
    input.id = field.id;
    input.name = field.name;
    input.placeholder = field.placeholder || "";
    if (field.required) input.required = true;
    if (field.type === "email") input.autocomplete = "nope";
    if (field.name === "name") input.autocomplete = "nope";
    if (field.validator && Array.isArray(field.validator)) {
      field.validator.forEach((rule) => {
        if (rule["min-length"]) input.minLength = rule["min-length"];
        if (rule["max-length"]) input.maxLength = rule["max-length"];
        if (rule.pattern) input.pattern = rule.pattern;
      });
    }

    inputWrapper.appendChild(icon);
    inputWrapper.appendChild(input);

    group.appendChild(label);
    group.appendChild(inputWrapper);

    return group;
  }

  createTextareaGroup(field) {
    const group = window.App.modules.util.createElement("div", "form-group");
    const label = window.App.modules.util.createElement("label", "form-label");
    label.htmlFor = field.id;

    const labelSpan = window.App.modules.util.createElement("span", "label-text", field.label);
    label.appendChild(labelSpan);

    if (field.required) {
      const requiredSpan = window.App.modules.util.createElement("span", "label-required", "*");
      label.appendChild(requiredSpan);
    }
    const inputWrapper = window.App.modules.util.createElement("div", "input-wrapper");
    const icon = window.App.modules.util.createElement("i", `input-icon textarea-icon ${field.class || ""}`);
    icon.innerHTML = field.icon || "";
    const textarea = window.App.modules.util.createElement("textarea", "form-input form-textarea");
    textarea.id = field.id;
    textarea.name = field.name;
    textarea.placeholder = field.placeholder || "";
    textarea.rows = field.rows || 5;
    if (field.required) textarea.required = true;
    if (field.validator && Array.isArray(field.validator)) {
      field.validator.forEach((rule) => {
        if (rule["min-length"]) textarea.minLength = rule["min-length"];
        if (rule["max-length"]) textarea.maxLength = rule["max-length"];
      });
    }

    inputWrapper.appendChild(icon);
    inputWrapper.appendChild(textarea);

    group.appendChild(label);
    group.appendChild(inputWrapper);

    return group;
  }

  createButton(btn) {
    const button = window.App.modules.util.createElement("button", "btn btn-submit");
    button.type = "button";
    button.id = btn.id || "contact-form-button";

    const btnText = window.App.modules.util.createElement("span", "btn-text", btn.text || "Submit");
    const btnIcon = window.App.modules.util.createElement("i", `btn-icon ${btn.class || ""}`);
    btnIcon.innerHTML = btn.icon || "";

    button.appendChild(btnText);
    button.appendChild(btnIcon);

    return button;
  }

  setupFormHandler() {
    this.form = document.getElementById("contact-form");
    this.formButton = document.querySelector(".btn-submit");
    this.formStatus = document.getElementById("contact-form-status");

    if (!this.form || !this.formButton) return;
    this.formButton.addEventListener("click", (event) => this.handleSubmit(event));
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit(event);
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (!this.form.checkValidity()) {
      this.form.reportValidity();
      return;
    }
    this.formStatus.className = "form-status";
    this.formStatus.innerHTML = "";
    const loadingIcon = "&#xf110;";    this.formButton.disabled = true;
    this.formButton.classList.add("loading");
    this.formButton.querySelector(".btn-text").textContent = "Sending...";
    this.formButton.querySelector(".btn-icon").innerHTML = loadingIcon;

    try {
      const data = new FormData(this.form);
      const actionURL = this.config.contact.on;
      if (!actionURL) {
        throw new Error("Form action URL not configured");
      }

      const response = await fetch(actionURL, {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const successMsg = this.config.contact.messages?.find((m) => m.type === "success");
        const icon = successMsg?.icon || "&#xf164;";
        const message = successMsg?.message || "Thanks for your message! I'll get back to you soon.";

        this.showStatus("success", `<i class="status-icon ${successMsg?.class || "fa"}">${icon}</i>${message}`);
        this.form.reset();
      } else {
        const errorData = await response.json();
        const errorMsg = this.config.contact.messages?.find((m) => m.type === "error");
        const icon = errorMsg?.icon || "&#xf5b4;";
        let message = errorMsg?.message || "Oops! There was a problem submitting your form";

        if (errorData.errors) {
          message = errorData.errors.map((error) => error.message).join(", ");
        }

        this.showStatus("error", `<i class="status-icon ${errorMsg?.class || "fa"}">${icon}</i>${message}`);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      const errorMsg = this.config.contact.messages?.find((m) => m.type === "error");
      const icon = errorMsg?.icon || "&#xf5b4;";
      const message = errorMsg?.message || "Oops! There was a problem submitting your form";

      this.showStatus("error", `<i class="status-icon ${errorMsg?.class || "fa"}">${icon}</i>${message}`);
    } finally {
      const submitBtn = this.config.contact.buttons?.find((b) => b.type === "submit");
      this.formButton.disabled = false;
      this.formButton.classList.remove("loading");
      this.formButton.querySelector(".btn-text").textContent = submitBtn?.text || "Send Message";
      this.formButton.querySelector(".btn-icon").innerHTML = submitBtn?.icon || "&#xe4e8;";
    }
  }

  showStatus(type, message) {
    this.formStatus.className = `form-status ${type} show`;
    this.formStatus.innerHTML = message;
    setTimeout(() => {
      this.formStatus.classList.remove("show");
    }, 5000);
  }
  submit() {
    if (this.formButton) {
      this.formButton.click();
    }
  }
  getFormData() {
    if (!this.form) return null;
    return new FormData(this.form);
  }
  validate() {
    if (!this.form) return false;
    return this.form.checkValidity();
  }

  cleanup() {
    const containerInfo = document.querySelector("[data-contacts-info]");
    const container = document.querySelector("[data-contacts]");
    const formContainer = document.querySelector("[data-contact-form]");

    if (containerInfo) containerInfo.innerHTML = "";
    if (container) container.innerHTML = "";
    if (formContainer) formContainer.innerHTML = "";

    this.config = null;
    this.form = null;
    this.formButton = null;
    this.formStatus = null;
  }
}

function initContact() {
  if (window.App?.modules?.contacts) {
    window.App.modules.contacts.cleanup?.();
  }
  const contactsModule = new Contacts();
  window.App.register("contacts", contactsModule, "initContact");
  contactsModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContact);
} else {
  initContact();
}

export { Contacts, initContact };
