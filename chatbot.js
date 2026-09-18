/* Replify chatbot embed.
   Loaded by every page via <script src="chatbot.js"></script> before </body>.

   Launcher icon is 69px (25% larger than the vendor default of 55px);
   the corner radius and drop shadow are scaled by the same factor so the
   button keeps its original proportions. If you resize it again, the radius
   and shadow do not auto-scale -- adjust them to match.

   Background is the MAC × Apex MD red, --mac-red / #C50806 from mac-theme.css,
   written here as rgb(197, 8, 6). It is hard-coded rather than using
   var(--mac-red) because this SVG is handed to the vendor's widget, which
   may render it outside the page's own stylesheet scope. If the brand red
   ever changes in the theme, change it here too. */

window.addEventListener("load", function () {
  window.agentId = '469a3eae-48be-4eb5-9556-e2d4b9fb1e82'; /* Apex MD's shared Replify agent -- the same one every Apex MD partner microsite uses. */
  window.baseurl = 'https://myreplify.ai/';
  window.CHATBOT_SVG = '<svg viewBox="-9 -9 41 41" style="background-color: rgb(197, 8, 6); width: 69px; height: 69px; border-radius: 10px; box-shadow: rgba(0, 0, 0, 0.25) 0px 5px 5px; fill: rgb(255, 255, 255);"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M9 11H7V9h2zm4 0h-2V9h2zm4 0h-2V9h2z"></path></svg>';
  const chatbotEmbedScriptWithOldImageByDefault = document.createElement("script");
  chatbotEmbedScriptWithOldImageByDefault.src = window.baseurl + "js/chatbot-embed.js";
  document.head.appendChild(chatbotEmbedScriptWithOldImageByDefault);
});
