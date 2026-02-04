const elements = {
  generatedAt: document.getElementById('generatedAt'),
  totalCommands: document.getElementById('totalCommands'),
  slashEnabled: document.getElementById('slashEnabled'),
  categoriesCount: document.getElementById('categoriesCount'),
  subcategoriesCount: document.getElementById('subcategoriesCount'),
  searchInput: document.getElementById('searchInput'),
  refreshButton: document.getElementById('refreshButton'),
  categories: document.getElementById('categories'),
};

let featureData = null;

const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleString();
};

const buildBadge = (label, accent = false) => {
  const badge = document.createElement('span');
  badge.className = `badge${accent ? ' accent' : ''}`;
  badge.textContent = label;
  return badge;
};

const renderCommands = (commands, query) => {
  const fragment = document.createDocumentFragment();
  const matches = (command) => {
    const haystack = [
      command.name,
      command.description,
      command.usage,
      (command.aliases || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  };

  const filtered = commands.filter((command) => matches(command));
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No commands match your search.';
    fragment.appendChild(empty);
    return fragment;
  }

  const grid = document.createElement('div');
  grid.className = 'command-grid';

  for (const command of filtered) {
    const card = document.createElement('article');
    card.className = 'command-card';

    const title = document.createElement('h3');
    title.textContent = command.name;

    const description = document.createElement('p');
    description.textContent = command.description;

    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.appendChild(buildBadge(command.category));
    if (command.subcategory) {
      badges.appendChild(buildBadge(command.subcategory));
    }
    if (command.enabledSlash) {
      badges.appendChild(buildBadge('Slash', true));
    }
    if (command.aliases && command.aliases.length) {
      badges.appendChild(buildBadge(`Aliases: ${command.aliases.join(', ')}`));
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const usage = command.usage ? `Usage: ${command.usage}` : 'Usage: —';
    meta.textContent = `${usage} • ${command.path}`;

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(badges);
    card.appendChild(meta);

    grid.appendChild(card);
  }

  fragment.appendChild(grid);
  return fragment;
};

const renderCategory = (category, query) => {
  const section = document.createElement('section');
  section.className = 'category';

  const heading = document.createElement('h2');
  heading.textContent = category.name;

  const meta = document.createElement('small');
  const commandCount = category.commands.length + category.subcategories.reduce((acc, sub) => acc + sub.commands.length, 0);
  meta.textContent = `${commandCount} commands`;

  section.appendChild(heading);
  section.appendChild(meta);

  if (category.commands.length) {
    section.appendChild(renderCommands(category.commands, query));
  }

  for (const subcategory of category.subcategories) {
    const subHeading = document.createElement('h3');
    subHeading.textContent = subcategory.name;
    subHeading.style.marginTop = '18px';
    section.appendChild(subHeading);
    section.appendChild(renderCommands(subcategory.commands, query));
  }

  return section;
};

const render = (query = '') => {
  elements.categories.innerHTML = '';
  if (!featureData) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Loading features…';
    elements.categories.appendChild(empty);
    return;
  }

  const normalized = query.trim().toLowerCase();
  const fragment = document.createDocumentFragment();

  for (const category of featureData.categories) {
    const categorySection = renderCategory(category, normalized);
    fragment.appendChild(categorySection);
  }

  if (!featureData.categories.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No commands found.';
    fragment.appendChild(empty);
  }

  elements.categories.appendChild(fragment);
};

const updateSummary = () => {
  if (!featureData) return;
  elements.generatedAt.textContent = `Generated ${formatDate(featureData.generatedAt)}`;
  elements.totalCommands.textContent = featureData.summary.totalCommands;
  elements.slashEnabled.textContent = featureData.summary.slashEnabled;
  elements.categoriesCount.textContent = featureData.summary.categories;
  elements.subcategoriesCount.textContent = featureData.summary.subcategories;
};

const fetchFeatures = async (refresh = false) => {
  const endpoint = refresh ? '/api/features?refresh=1' : '/api/features';
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('Failed to load features');
  }
  featureData = await response.json();
  updateSummary();
  render(elements.searchInput.value);
};

const init = async () => {
  try {
    await fetchFeatures();
  } catch (error) {
    elements.categories.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Unable to load dashboard data.';
    elements.categories.appendChild(empty);
  }
};

elements.searchInput.addEventListener('input', (event) => {
  render(event.target.value);
});

elements.refreshButton.addEventListener('click', () => {
  fetchFeatures(true);
});

init();
