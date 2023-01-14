import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInputCJS from 'ink-text-input';
import { LogLine, LOG_LEVEL } from './logging.js';
import Theme from './theme.js';
import { Tab, Tabs } from 'ink-tab';

type Props = {
  moduleNameSet: Set<string>;
  logLines: LogLine[];
};

function colorFromLevel(level: LogLine['level']): Theme | undefined {
  switch (level) {
    case LOG_LEVEL.DEBUG:
      return Theme.debug;
    case LOG_LEVEL.INFO:
      return Theme.moduleName;
    case LOG_LEVEL.WARN:
      return Theme.warn;
    case LOG_LEVEL.ERROR:
      return Theme.error;
    default:
      return;
  }
}

let maxLogLevelLength: number | undefined;

const getMaxLogLevelLength = () => {
  if (!maxLogLevelLength) {
    maxLogLevelLength = Math.max(
      ...Object.values(LOG_LEVEL).map((level) => level.length)
    );
  }

  return maxLogLevelLength;
};

type LineProps = { line: LogLine; displayModuleName: boolean; padEnd: number };

function LogLine({ line, displayModuleName, padEnd }: LineProps): JSX.Element {
  return (
    <Box>
      <Box marginRight={1}>
        <Text color={Theme.date}>{line.date.toISOString()}</Text>
      </Box>
      <Box marginRight={1}>
        <Text color={colorFromLevel(line.level)}>
          {displayModuleName
            ? line.moduleName.padEnd(padEnd)
            : line.level.padEnd(padEnd)}
        </Text>
      </Box>
      <Text color={line.color}>{line.text}</Text>
    </Box>
  );
}

export default function Renderer({
  logLines,
  moduleNameSet,
}: Props): JSX.Element {
  // TODO will come next. See https://github.com/mapado/watch-module/issues/20
  // const [inputVisible, setInputVisible] = useState(false);
  // const [query, setQuery] = useState('');
  const [activeTabName, setActiveTabName] = useState<string>('watch-module');

  // TODO will come next. See https://github.com/mapado/watch-module/issues/20
  // useInput((input, key) => {
  //   if (input === 'a') {
  //     // ask for input
  //     setInputVisible(true);
  //   }

  //   if (key.return) {
  //     // hide input
  //     setInputVisible(false);
  //     console.log(query);
  //   }
  // });

  const handleTabChange = (tabName: string) => {
    setActiveTabName(tabName);
  };

  const filterActiveModule = (line: LogLine) => {
    if (activeTabName === null || activeTabName === 'watch-module') {
      return true;
    }

    return line.moduleName === activeTabName;
  };

  const moduleNames = ['watch-module', ...moduleNameSet];
  const moduleNameMaxLength = Math.max(
    ...moduleNames.map((moduleName) => moduleName.length)
  );

  return (
    <Box flexDirection="column">
      {logLines.filter(filterActiveModule).map((line, index) => {
        return (
          <LogLine
            key={index}
            line={line}
            displayModuleName={activeTabName === 'watch-module'}
            padEnd={
              activeTabName === 'watch-module'
                ? moduleNameMaxLength
                : getMaxLogLevelLength()
            }
          />
        );
      })}

      <Tabs onChange={handleTabChange}>
        {moduleNames.map((moduleName) => (
          <Tab key={moduleName} name={moduleName}>
            {moduleName}
          </Tab>
        ))}
      </Tabs>

      {/* TODO will come next. See https://github.com/mapado/watch-module/issues/20
      <Box>
        {inputVisible ? (
          <>
            <Box marginRight={1}>
              <Text>Enter your query:</Text>
            </Box>

            <TextInput value={query} onChange={setQuery} />
          </>
        ) : (
          <Text italic>Press "a" to add another package to watch</Text>
        )}
      </Box> */}
    </Box>
  );
}
