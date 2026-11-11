(() => {
  const comparisonForm = document.getElementById('solarComparisonForm');
  const comparisonResult = document.getElementById('comparisonResult');
  const comparisonStatus = document.getElementById('comparisonStatus');

  const formatNumber = (value, fractionDigits = 2) => new Intl.NumberFormat('en', {
    maximumFractionDigits: fractionDigits,
  }).format(value);

  const appendResultLine = (output, text, strongText, strongFirst = true) => {
    const line = document.createElement('p');
    line.className = 'solar-result-line';
    if (strongText) {
      const strong = document.createElement('strong');
      strong.textContent = strongText;
      const textNode = document.createTextNode(text);
      line.append(...(strongFirst ? [strong, textNode] : [textNode, strong]));
    } else {
      line.textContent = text;
    }
    output.append(line);
  };

  const clearInvalidState = (form) => {
    form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.setCustomValidity('');
    });
  };

  const markInvalid = (input, message) => {
    input.setCustomValidity(message);
    input.setAttribute('aria-invalid', 'true');
  };

  if (comparisonForm instanceof HTMLFormElement) {
    comparisonForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearInvalidState(comparisonForm);
      comparisonStatus.textContent = '';
      comparisonResult.replaceChildren();

      const typicalInput = document.getElementById('typicalGeneration');
      const hotInput = document.getElementById('hotGeneration');
      const inputs = [typicalInput, hotInput];
      let firstInvalid = null;

      inputs.forEach((input) => {
        if (!input.value.trim()) markInvalid(input, 'Enter a generation reading.');
        else if (!input.validity.valid) markInvalid(input, 'Enter a number that is zero or greater.');
        if (input.validity.customError || !input.validity.valid) {
          input.setAttribute('aria-invalid', 'true');
          firstInvalid = firstInvalid || input;
        }
      });

      if (firstInvalid) {
        comparisonStatus.textContent = 'Enter both readings as zero or greater.';
        firstInvalid.focus();
        return;
      }

      const typical = Number(typicalInput.value);
      const hot = Number(hotInput.value);
      const difference = hot - typical;
      const direction = difference > 0 ? 'more' : difference < 0 ? 'less' : 'the same';
      const absoluteDifference = Math.abs(difference);
      const differenceText = `${formatNumber(absoluteDifference)} kWh ${direction}`;
      const percentage = typical === 0 ? null : (difference / typical) * 100;

      comparisonResult.hidden = false;
      appendResultLine(comparisonResult, 'Observed difference in solar generation: ', differenceText, false);

      if (typical === 0) {
        appendResultLine(comparisonResult, 'Percentage change: cannot be calculated because the typical sunny day reading is zero.');
      } else if (!Number.isFinite(percentage)) {
        appendResultLine(comparisonResult, 'Percentage change is outside the calculator range for these readings.');
      } else {
        const percentageDirection = percentage > 0 ? 'increase' : percentage < 0 ? 'decrease' : 'no change';
        appendResultLine(
          comparisonResult,
          ` compared with the typical sunny day (${percentageDirection}).`,
          `${formatNumber(Math.abs(percentage))}%`,
        );
      }
    });

    comparisonForm.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement) {
        event.target.removeAttribute('aria-invalid');
        event.target.setCustomValidity('');
      }
      comparisonStatus.textContent = '';
    });

    comparisonForm.addEventListener('reset', () => {
      comparisonResult.hidden = true;
      comparisonResult.replaceChildren();
      comparisonStatus.textContent = '';
      clearInvalidState(comparisonForm);
    });
  }

  const systemForm = document.getElementById('systemCheckForm');
  const systemResults = document.getElementById('systemCheckResults');
  const systemTaskList = document.getElementById('systemCheckTaskList');
  const systemStatus = document.getElementById('systemCheckStatus');
  const systemProgress = document.getElementById('systemCheckProgress');

  const recommendation = (id, text, priority = 'routine') => ({ id, text, priority });

  const buildRecommendations = (answers) => {
    const checks = [];

    if (answers.installation === 'roof') {
      checks.push(recommendation('roof-visual', 'From the ground, look for visible panel or frame damage and new shading. Never climb onto the roof.'));
    } else if (answers.installation === 'ground') {
      checks.push(recommendation('ground-visual', 'From a safe position, look for shading, leaves or other debris, and visible panel or frame damage. Do not touch panels or electrical connections.'));
    } else {
      checks.push(recommendation('installation-unknown', 'Check your system paperwork to learn where the panels are mounted. Until then, look only from a safe position and never climb onto a roof.'));
    }

    if (answers.battery === 'yes') {
      checks.push(recommendation('battery-guidance', "Read the battery manufacturer's installation instructions, temperature limits and ventilation requirements. Keep required clearances open and do not open the battery enclosure."));
    } else if (answers.battery === 'unsure') {
      checks.push(recommendation('battery-unknown', "Check your system documents to find out whether you have a battery. If you do, follow its manufacturer's temperature and ventilation instructions."));
    }

    if (!answers.issues.has('fault')) {
      if (answers.inverter === 'yes') {
        checks.push(recommendation('inverter-display', 'Review the inverter display or monitoring screen for warning or fault indicators. Record any message or code without opening the equipment.'));
      } else if (answers.inverter === 'no') {
        checks.push(recommendation('no-display', 'Do not open electrical equipment to look for a display. Ask your installer or a qualified technician how to check system status.'));
      } else {
        checks.push(recommendation('display-unknown', 'Check your system documents to identify whether an inverter or monitoring display is available. Do not remove covers to look for one.'));
      }
    }

    if (answers.issues.has('shading')) {
      checks.push(recommendation('reported-shading', 'From the ground, note when and where nearby trees or structures shade the panels. Ask a qualified provider before changing anything around the installation.'));
    }
    if (answers.issues.has('dirt')) {
      const dirtGuidance = answers.issues.has('damage')
        ? 'Since panel damage was reported, leave the panels untouched and have a qualified technician inspect them before arranging cleaning.'
        : "Check for visible dirt from a safe position. Follow the manufacturer's cleaning instructions and arrange qualified help for roof access or difficult cleaning.";
      checks.push(recommendation('reported-dirt', dirtGuidance));
    }
    if (answers.issues.has('damage')) {
      checks.push(recommendation('reported-damage', 'Keep clear of damaged panels. Do not touch or clean them. Wait for a qualified solar technician to inspect the system before any repair.', 'urgent'));
    }
    if (answers.issues.has('fault')) {
      checks.push(recommendation('reported-fault', "Do not open the inverter or attempt electrical work. Record any warning message or code and contact a qualified solar technician before resetting or repairing the equipment.", 'urgent'));
    }
    if (answers.issues.has('none')) {
      checks.push(recommendation('no-issues-reported', 'Continue routine visual checks from a safe position and review your inverter display when it is available.'));
    }
    if (answers.issues.has('unsure')) {
      checks.push(recommendation('issues-unknown', 'If you are unsure whether a condition is a problem, take note of what you can see from a safe position and ask a qualified technician.'));
    }

    checks.push(recommendation('ventilation-visual', 'Check from a safe position that ventilation openings around the inverter and other equipment are not blocked. Do not move covers or exposed electrical parts.'));
    return [
      ...checks.filter(({ priority }) => priority === 'urgent'),
      ...checks.filter(({ priority }) => priority !== 'urgent'),
    ];
  };

  const updateSystemProgress = () => {
    const tasks = [...systemTaskList.querySelectorAll('input[type="checkbox"]')];
    const completed = tasks.filter((task) => task.checked).length;
    systemProgress.textContent = `${completed} of ${tasks.length} checks complete`;
  };
  systemTaskList.addEventListener('change', updateSystemProgress);

  const renderSystemRecommendations = (answers) => {
    const checks = buildRecommendations(answers);
    const urgentChecks = checks.filter(({ priority }) => priority === 'urgent');
    const routineChecks = checks.filter(({ priority }) => priority !== 'urgent');
    const checklistNote = systemResults.querySelector('.solar-checklist-note');
    systemTaskList.replaceChildren();

    const appendRecommendationGroup = (title, recommendations, priorityClass = '') => {
      if (recommendations.length === 0) return;
      const group = document.createElement('section');
      group.className = `solar-recommendation-group${priorityClass ? ` ${priorityClass}` : ''}`;
      const heading = document.createElement('h4');
      heading.className = 'solar-recommendation-group-heading';
      heading.textContent = title;
      const tasks = document.createElement('div');
      tasks.className = 'solar-task-list';

      recommendations.forEach(({ id, text }) => {
        const label = document.createElement('label');
        label.className = 'solar-task';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = id;
        const description = document.createElement('span');
        description.textContent = text;
        label.append(checkbox, description);
        tasks.append(label);
      });

      group.append(heading, tasks);
      systemTaskList.append(group);
    };

    appendRecommendationGroup('Urgent safety actions', urgentChecks, 'is-urgent');
    appendRecommendationGroup(urgentChecks.length ? 'Routine checks' : 'System checks', routineChecks);

    if (answers.issues.size > 1) {
      checklistNote.textContent = 'Several issues are marked. Each has separate guidance below, with safety actions before routine checks when needed.';
    } else if (urgentChecks.length) {
      checklistNote.textContent = 'Review the urgent safety guidance before continuing with routine checks.';
    } else {
      checklistNote.textContent = 'These suggestions follow the details you selected. Change your answers above and build the checklist again if your information changes.';
    }

    systemResults.hidden = false;
    updateSystemProgress();
    systemResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (systemForm instanceof HTMLFormElement) {
    const issueInputs = [...systemForm.querySelectorAll('input[name="issues"]')];
    issueInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.value === 'none' || input.value === 'unsure') {
          if (input.checked) issueInputs.filter((other) => other !== input).forEach((other) => { other.checked = false; });
        } else if (input.checked) {
          issueInputs.filter((other) => other.value === 'none' || other.value === 'unsure').forEach((other) => { other.checked = false; });
        }
      });
    });

    systemForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const installation = systemForm.querySelector('input[name="installation"]:checked');
      const battery = systemForm.querySelector('input[name="battery"]:checked');
      const inverter = systemForm.querySelector('input[name="inverter"]:checked');
      if (!installation || !battery || !inverter) {
        systemStatus.textContent = 'Choose an answer for panel installation, battery and inverter or monitoring display.';
        const firstMissing = !installation
          ? systemForm.querySelector('input[name="installation"]')
          : !battery
            ? systemForm.querySelector('input[name="battery"]')
            : systemForm.querySelector('input[name="inverter"]');
        firstMissing.focus();
        return;
      }

      systemStatus.textContent = '';
      renderSystemRecommendations({
        installation: installation.value,
        battery: battery.value,
        inverter: inverter.value,
        issues: new Set(issueInputs.filter((input) => input.checked).map((input) => input.value)),
      });
    });

    systemForm.addEventListener('change', () => {
      systemForm.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.closest('label').classList.toggle('is-selected', input.checked);
      });
      if (!systemResults.hidden) {
        systemResults.hidden = true;
        systemStatus.textContent = 'Answers changed. Build the checklist again to update your suggestions.';
      }
    });

    systemForm.addEventListener('reset', () => {
      systemResults.hidden = true;
      systemStatus.textContent = '';
      systemTaskList.replaceChildren();
      systemForm.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.closest('label').classList.remove('is-selected');
      });
    });
  }

  const progressGroups = [
    {
      key: 'sunnrSolarMaintenanceTasks',
      container: document.querySelector('[data-storage-group="maintenance"]'),
      progress: document.getElementById('maintenanceProgress'),
      status: document.getElementById('maintenanceStorageStatus'),
      label: 'maintenance tasks',
    },
    {
      key: 'sunnrSolarHeatwaveTasks',
      container: document.querySelector('[data-storage-group="heatwave"]'),
      progress: document.getElementById('heatwaveProgress'),
      status: document.getElementById('heatwaveStorageStatus'),
      label: 'heatwave preparation tasks',
    },
  ];

  const readSavedIds = (key, validIds) => {
    let saved;
    try {
      saved = window.localStorage.getItem(key);
    } catch (error) {
      return { ids: new Set(), message: 'Browser storage is unavailable. Checklist progress will last for this visit only.' };
    }

    if (saved === null) return { ids: new Set(), message: '' };

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)
        || new Set(parsed).size !== parsed.length
        || parsed.some((id) => typeof id !== 'string' || !validIds.has(id))) {
        return { ids: new Set(), message: 'Saved checklist data was invalid, so this list has been reset.' };
      }
      return { ids: new Set(parsed), message: '' };
    } catch (error) {
      return { ids: new Set(), message: 'Saved checklist data was invalid, so this list has been reset.' };
    }
  };

  progressGroups.forEach(({ key, container, progress, status, label }) => {
    if (!container) return;
    const tasks = [...container.querySelectorAll('input[data-task-id]')];
    const validIds = new Set(tasks.map((task) => task.dataset.taskId));
    const saved = readSavedIds(key, validIds);
    status.textContent = saved.message;
    tasks.forEach((task) => { task.checked = saved.ids.has(task.dataset.taskId); });

    const updateProgress = () => {
      const completedIds = tasks.filter((task) => task.checked).map((task) => task.dataset.taskId);
      progress.textContent = `${completedIds.length} of ${tasks.length} complete`;
      try {
        window.localStorage.setItem(key, JSON.stringify(completedIds));
        status.textContent = '';
      } catch (error) {
        status.textContent = 'Browser storage is unavailable. Checklist progress will last for this visit only.';
      }
    };

    tasks.forEach((task) => task.addEventListener('change', updateProgress));
    progress.setAttribute('aria-label', `${label} completed`);
    const completed = saved.ids.size;
    progress.textContent = `${completed} of ${tasks.length} complete`;
  });

  const applianceForm = document.getElementById('applianceForm');
  const applianceRows = document.getElementById('applianceRows');
  const addApplianceButton = document.getElementById('addApplianceButton');
  const applianceResult = document.getElementById('applianceResult');
  const applianceStatus = document.getElementById('applianceStatus');
  let applianceCounter = 1;

  const updateRemoveButtons = () => {
    const rows = [...applianceRows.querySelectorAll('[data-appliance-row]')];
    rows.forEach((row) => {
      const button = row.querySelector('.remove-appliance-button');
      button.hidden = rows.length === 1;
      const name = row.querySelector('[name="applianceName"]').value.trim();
      button.setAttribute('aria-label', name ? `Remove ${name}` : 'Remove appliance');
    });
  };

  applianceRows.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.remove-appliance-button');
    if (!(button instanceof HTMLButtonElement) || button.hidden) return;
    const row = button.closest('[data-appliance-row]');
    const rows = [...applianceRows.querySelectorAll('[data-appliance-row]')];
    if (!row || rows.length <= 1) return;

    const removedIndex = rows.indexOf(row);
    row.remove();
    updateRemoveButtons();
    applianceResult.hidden = true;
    applianceStatus.textContent = '';

    const remainingRows = [...applianceRows.querySelectorAll('[data-appliance-row]')];
    const nextButton = remainingRows[Math.min(removedIndex, remainingRows.length - 1)]
      .querySelector('.remove-appliance-button');
    if (nextButton.hidden) addApplianceButton.focus();
    else nextButton.focus();
  });

  const addApplianceRow = () => {
    applianceCounter += 1;
    const row = document.createElement('div');
    row.className = 'appliance-row';
    row.dataset.applianceRow = '';

    const fields = [
      { key: 'applianceName', label: 'Appliance name', type: 'text', maxLength: '60' },
      { key: 'applianceWatts', label: 'Rated power (W)', type: 'number', min: '0' },
      { key: 'applianceHours', label: 'Daily operating hours', type: 'number', min: '0', max: '24' },
    ];

    fields.forEach(({ key, label, type, min, max, maxLength }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'solar-field';
      const id = `${key}${applianceCounter}`;
      const fieldLabel = document.createElement('label');
      fieldLabel.htmlFor = id;
      fieldLabel.textContent = label;
      const input = document.createElement('input');
      input.id = id;
      input.name = key;
      input.type = type;
      input.required = true;
      if (min !== undefined) input.min = min;
      if (max !== undefined) input.max = max;
      if (maxLength !== undefined) input.maxLength = Number(maxLength);
      if (type === 'number') {
        input.step = 'any';
        input.inputMode = 'decimal';
        const numberControl = document.createElement('div');
        numberControl.className = 'solar-number-control';
        numberControl.append(input);
        wrapper.append(fieldLabel, numberControl);
      } else {
        wrapper.append(fieldLabel, input);
      }
      row.append(wrapper);
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-appliance-button';
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', 'Remove appliance');
    row.append(removeButton);
    applianceRows.append(row);
    updateRemoveButtons();
    row.querySelector('input').focus();
  };

  if (addApplianceButton instanceof HTMLButtonElement) {
    addApplianceButton.addEventListener('click', addApplianceRow);
  }

  if (applianceForm instanceof HTMLFormElement) {
    applianceForm.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement) {
        event.target.removeAttribute('aria-invalid');
        event.target.setCustomValidity('');
      }
      applianceResult.hidden = true;
      applianceStatus.textContent = '';
      updateRemoveButtons();
    });

    applianceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearInvalidState(applianceForm);
      applianceResult.replaceChildren();
      applianceStatus.textContent = '';
      let firstInvalid = null;
      const rows = [...applianceRows.querySelectorAll('[data-appliance-row]')];
      const appliances = rows.map((row) => {
        const name = row.querySelector('[name="applianceName"]');
        const watts = row.querySelector('[name="applianceWatts"]');
        const hours = row.querySelector('[name="applianceHours"]');
        if (!name.value.trim()) markInvalid(name, 'Enter an appliance name.');
        if (!watts.value.trim()) markInvalid(watts, 'Enter the rated power in watts.');
        else if (!watts.validity.valid) markInvalid(watts, 'Enter a power value that is zero or greater.');
        if (!hours.value.trim()) markInvalid(hours, 'Enter daily operating hours.');
        else if (!hours.validity.valid) markInvalid(hours, 'Enter daily hours between zero and 24.');
        [name, watts, hours].forEach((input) => {
          if (!input.validity.valid) {
            input.setAttribute('aria-invalid', 'true');
            firstInvalid = firstInvalid || input;
          }
        });
        return {
          name: name.value.trim(),
          watts: Number(watts.value),
          hours: Number(hours.value),
        };
      });

      const batteryInput = document.getElementById('batteryCapacity');
      if (batteryInput.value.trim() && !batteryInput.validity.valid) {
        markInvalid(batteryInput, 'Enter a battery capacity that is zero or greater.');
        batteryInput.setAttribute('aria-invalid', 'true');
        firstInvalid = firstInvalid || batteryInput;
      }

      if (firstInvalid) {
        applianceStatus.textContent = 'Check the highlighted fields. Power and capacity must be zero or greater, and daily hours must be between zero and 24.';
        firstInvalid.focus();
        return;
      }

      const wattHours = appliances.reduce((total, appliance) => total + appliance.watts * appliance.hours, 0);
      if (!Number.isFinite(wattHours)) {
        applianceStatus.textContent = 'The entered values are too large to calculate. Check the power and hours, then try again.';
        return;
      }
      const kiloWattHours = wattHours / 1000;
      applianceResult.hidden = false;
      appliances.forEach((appliance) => {
        const energy = appliance.watts * appliance.hours;
        appendResultLine(
          applianceResult,
          `: ${formatNumber(energy)} Wh (${formatNumber(energy / 1000, 3)} kWh)`,
          appliance.name,
        );
      });
      appendResultLine(
        applianceResult,
        ` per day (${formatNumber(kiloWattHours, 3)} kWh).`,
        `Estimated total: ${formatNumber(wattHours)} Wh`,
      );

      if (batteryInput.value.trim()) {
        const capacity = Number(batteryInput.value);
        const difference = Math.abs(kiloWattHours - capacity);
        let comparison;
        if (difference < Number.EPSILON * Math.max(1, kiloWattHours, capacity)) {
          comparison = 'Estimated daily energy use matches the entered usable battery capacity.';
        } else if (kiloWattHours > capacity) {
          comparison = `Estimated daily energy use is ${formatNumber(difference, 3)} kWh above the entered usable battery capacity.`;
        } else {
          comparison = `Estimated daily energy use is ${formatNumber(difference, 3)} kWh below the entered usable battery capacity.`;
        }
        appendResultLine(applianceResult, comparison);
      } else {
        appendResultLine(applianceResult, 'Battery comparison: no usable battery capacity was entered.');
      }
    });

    applianceForm.addEventListener('reset', () => {
      applianceResult.hidden = true;
      applianceResult.replaceChildren();
      applianceStatus.textContent = '';
      clearInvalidState(applianceForm);
      window.setTimeout(() => {
        const rows = [...applianceRows.querySelectorAll('[data-appliance-row]')];
        rows.slice(1).forEach((row) => row.remove());
        applianceCounter = 1;
        updateRemoveButtons();
      });
    });

    updateRemoveButtons();
  }
})();
