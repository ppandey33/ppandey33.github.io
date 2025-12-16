class Contacts {
  constructor() {
    this.config = null;
  }

  async init() {
    await this.loadContacts();
  }

  async loadContacts() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config?.contacts) return;

    this.renderContactInfo();
    this.renderContactDetails();
  }

  renderContactInfo() {
    const containerInfo = document.querySelector("[data-contacts-info]");
    if (!containerInfo) return;

    containerInfo.innerHTML = "";
    const heading = window.App.modules.util.createElement("h2", "contacts-title", this.config.contacts.title);
    const desc = window.App.modules.util.createElement("p", "contacts-description", this.config.contacts.description);

    containerInfo.appendChild(heading);
    containerInfo.appendChild(desc);
  }

  renderContactDetails() {
    const container = document.querySelector("[data-contacts]");
    if (!container || !this.config?.contacts?.details) return;

    container.innerHTML = "";
    this.config.contacts.details.forEach((contact) => {
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

  cleanup() {
    const containerInfo = document.querySelector("[data-contacts-info]");
    const container = document.querySelector("[data-contacts]");

    if (containerInfo) containerInfo.innerHTML = "";
    if (container) container.innerHTML = "";
    this.config = null;
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
