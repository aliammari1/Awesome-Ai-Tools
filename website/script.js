const fs = require("fs");
const readline = require("readline");

const processLineByLine = async () => {
  const fileStream = fs.createReadStream("README.md");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const linkRegex = /- \[([^\]]+)\]\(([^)]+)\) -/g;
  const leftNavTitleRegex = /## (.+)/g;
  const titleRegex = /### (.+)/g;
  let match;
  const links = [];
  const titles = [];
  let lineNumber = 1;
  let currentTitle = null;
  let sections = [];

  for await (const line of rl) {
    if ((match = titleRegex.exec(line)) !== null) {
      if (currentTitle !== null) {
        sections.push(currentTitle);
      }
      currentTitle = { title: match[1], line: lineNumber, links: [] };
      titles.push(currentTitle);
    }

    while ((match = linkRegex.exec(line)) !== null) {
      if (match[2].startsWith("http")) {
        currentTitle.links.push({
          text: match[1],
          href: match[2],
          line: lineNumber,
        });
        links.push({
          text: match[1],
          href: match[2],
          line: lineNumber,
        });
      }
    }

    lineNumber++;
  }

  if (currentTitle !== null) {
    sections.push(currentTitle);
  }
  console.table(
    sections.map((section) => ({
      title: section.title,
      links: section.links.map((link) => link.text),
    }))
  );
  let html = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="style.css">
    </head>
    <nav>
        <ul>
    `;

  titles.forEach((title, index) => {
    html += `<li><a href="#section${title.title}">${title.title}</a></li>\n`;
  });

  html += `
        </ul>
    </nav>
    <main>
    <table>
        <tr><th>Title</th><th>Name</th><th>Link</th></tr>
    `;

  links.forEach((link, index) => {
    const title = titles.find((title) =>
      title.links.some((l) => l.href === link.href)
    );
    const titleText = title ? title.title : "Default Title";
    html += `<tr id="section${titleText}"><td>${titleText}</td><td>${link.text}</td><td><a href="${link.href}">${link.href}</a></td></tr>\n`;
  });
  html += "</table></main>";

  fs.writeFile("index.html", html, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("HTML file has been saved!");
  });
};
processLineByLine();
