import { HideComponent } from "../hide-component.js";

class Contacts extends HideComponent {
  constructor() {
    super({ currentPath: "/contact" });
  }

  async init() {
    await this.loadContacts();
  }

  async loadContacts() {
    const config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!config?.contacts) return;
    const containerInfo = document.querySelector("[data-contacts-info]");
    const container = document.querySelector("[data-contacts]");

    if (containerInfo) {
      containerInfo.innerHTML = "";
      const heading = window.App.modules.util.createElement("h2", "contacts-title", config.contacts.title);
      const desc = window.App.modules.util.createElement("p", "contacts-description", config.contacts.description);
      containerInfo.appendChild(heading);
      containerInfo.appendChild(desc);
    }

    if (container && config?.contacts?.details) {
      container.innerHTML = "";
      config.contacts.details.forEach((contact) => {
        const contactItem = window.App.modules.util.createElement("div", "contact-item"),
          icon = window.App.modules.util.createElement("i", `icon ${contact?.class || ""}`);
        icon.innerHTML = contact.icon;
        let value = null;
        if (contact?.link) {
          value = window.App.modules.util.createElement("a", "contact-value", contact.value);
          value.setAttribute("target", "_blank");
          value.href = contact.link || "#";
        } else {
          value = window.App.modules.util.createElement("span", "contact-value", contact?.value);
        }
        contactItem.appendChild(icon);
        contactItem.appendChild(value);
        container.appendChild(contactItem);
      });
    }
    this.manageDOM();
  }

  cleanup() {
    const containerInfo = document.querySelector("[data-contacts-info]");
    const container = document.querySelector("[data-contacts]");
    if (containerInfo) containerInfo.innerHTML = "";
    if (container) container.innerHTML = "";
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
