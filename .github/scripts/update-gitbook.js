const fs = require('fs');
const path = require('path');

// Read and parse README.md
function parseReadme() {
    const readmePath = path.join(process.cwd(), 'README.md');
    if (!fs.existsSync(readmePath)) {
        throw new Error('README.md not found in the current directory');
    }

    const content = fs.readFileSync(readmePath, 'utf-8');

    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    let currentSubsection = null;
    let collectingTools = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Main sections (## level) - Skip certain sections that shouldn't be included
        if (line.match(/^##\s+/) && !line.match(/^##\s+(Contents|� Getting Started|� Contributing|� License|� Support)/)) {
            if (currentSection) {
                sections.push(currentSection);
            }

            const title = line.replace(/^##\s+/, '').replace(/[🎯🎨💬📊🧠👁️🎵🎥💻🔍🤖🧪🏢🎮⚡🛡️🌐💼🏆🚀🤝📄🌟]/g, '').trim();
            currentSection = {
                title: title,
                slug: slugify(title),
                subsections: [],
                tools: []
            };
            currentSubsection = null;
            collectingTools = false; // Wait for a subsection or tool list
        }
        // Subsections (### level)
        else if (line.match(/^###\s+/) && currentSection) {
            if (currentSubsection) {
                currentSection.subsections.push(currentSubsection);
            }

            const title = line.replace(/^###\s+/, '').replace(/[⏰✅📧🖼️🎨✍️📝🌍🤖📈🔬📚☁️🎼🎤🎬📺💻🛠️🔍🌐📖🧠🔓🛠️📖📈💼🛒🎯🎪⚡🤖🔒📊🔧🎯💡🏷️]/g, '').trim();
            currentSubsection = {
                title: title,
                slug: slugify(title),
                tools: []
            };
            collectingTools = true;
        }
        // Tool entries (lines starting with -)
        else if (line.match(/^-\s+\[/) && collectingTools) {
            const toolMatch = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)\s+-\s+([^🆓💰]+)\.?\s*([🆓💰/]+)?/);
            if (toolMatch) {
                const tool = {
                    name: toolMatch[1],
                    url: toolMatch[2],
                    description: toolMatch[3].trim(),
                    pricing: toolMatch[4] || '💰'
                };

                if (currentSubsection) {
                    currentSubsection.tools.push(tool);
                } else if (currentSection) {
                    currentSection.tools.push(tool);
                }
            }
        }
        // Start collecting tools when we see a tool list in a main section (without subsections)
        else if (line.match(/^>\s+\*\*Must-try/) && currentSection && currentSection.subsections.length === 0) {
            collectingTools = true;
        }
        // Stop collecting tools when we hit another section or end of content
        else if (line.match(/^(#{1,6}|---)/)) {
            collectingTools = false;
        }
    }

    // Add the last section
    if (currentSection) {
        if (currentSubsection) {
            currentSection.subsections.push(currentSubsection);
        }
        sections.push(currentSection);
    }

    return sections;
}

// Convert title to slug
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and hyphens
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
        .trim();
}

// Create directory if it doesn't exist
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Generate markdown content for a section
function generateSectionContent(section) {
    let content = `# ${section.title}\n\n`;

    if (section.subsections.length > 0) {
        content += `AI tools for ${section.title.toLowerCase()}:\n\n`;

        // Add subsection descriptions
        for (const subsection of section.subsections) {
            content += `- **${subsection.title}**: Tools for ${subsection.title.toLowerCase()}\n`;
        }

        content += `\n## In This Section\n\n`;
        for (const subsection of section.subsections) {
            content += `{% page-ref page="${subsection.slug}.md" %}\n`;
        }
    } else if (section.tools.length > 0) {
        content += `AI tools for ${section.title.toLowerCase()}.\n\n## Available Tools\n\n`;

        for (const tool of section.tools) {
            content += `### ${tool.name}\n`;
            content += `- **Website**: [${tool.url}](${tool.url})\n`;
            content += `- **Description**: ${tool.description}\n`;
            content += `- **Pricing**: ${tool.pricing}\n\n`;
        }
    }

    return content;
}

// Generate markdown content for a subsection
function generateSubsectionContent(subsection, parentTitle) {
    let content = `# ${subsection.title}\n\n`;
    content += `${subsection.title} tools for ${parentTitle.toLowerCase()}.\n\n## Available Tools\n\n`;

    for (const tool of subsection.tools) {
        content += `### ${tool.name}\n`;
        content += `- **Website**: [${tool.url}](${tool.url})\n`;
        content += `- **Description**: ${tool.description}\n`;
        content += `- **Pricing**: ${tool.pricing}\n\n`;
    }

    return content;
}

// Generate SUMMARY.md content
function generateSummary(sections) {
    let content = `# Table of contents\n\n`;
    content += `* [Introduction](README.md)\n\n`;
    content += `## Sections\n`;

    for (const section of sections) {
        content += `* [${section.title}](docs/${section.slug}/README.md)\n`;

        for (const subsection of section.subsections) {
            content += `  * [${subsection.title}](docs/${section.slug}/${subsection.slug}.md)\n`;
        }
        content += `\n`;
    }

    return content;
}

// Main function
function updateGitBook() {
    console.log('🚀 Starting GitBook documentation update...');

    try {
        // Parse README.md
        const sections = parseReadme();
        console.log(`📚 Found ${sections.length} sections to process`);

        // Ensure docs directory exists
        const docsDir = path.join(process.cwd(), 'docs');
        ensureDirectory(docsDir);

        // Process each section
        for (const section of sections) {
            console.log(`📖 Processing section: ${section.title}`);

            const sectionDir = path.join(docsDir, section.slug);
            ensureDirectory(sectionDir);

            // Create section README
            const sectionReadmePath = path.join(sectionDir, 'README.md');
            const sectionContent = generateSectionContent(section);
            fs.writeFileSync(sectionReadmePath, sectionContent);
            console.log(`  ✅ Created ${sectionReadmePath}`);

            // Create subsection files
            for (const subsection of section.subsections) {
                const subsectionPath = path.join(sectionDir, `${subsection.slug}.md`);
                const subsectionContent = generateSubsectionContent(subsection, section.title);
                fs.writeFileSync(subsectionPath, subsectionContent);
                console.log(`  ✅ Created ${subsectionPath}`);
            }
        }

        // Update SUMMARY.md
        const summaryPath = path.join(process.cwd(), 'SUMMARY.md');
        const summaryContent = generateSummary(sections);
        fs.writeFileSync(summaryPath, summaryContent);
        console.log(`✅ Updated ${summaryPath}`);

        console.log('🎉 GitBook documentation update completed successfully!');

    } catch (error) {
        console.error('❌ Error updating GitBook documentation:', error);
        process.exit(1);
    }
}

// Run the update
updateGitBook();
