import React, { useCallback, useState } from 'react';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import { DropzoneArea } from 'material-ui-dropzone';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dropzone: {
      minHeight: 200,
      margin: theme.spacing(2),
      border: `2px dashed ${theme.palette.grey[400]}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(2),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      cursor: 'pointer',
    },
  }),
);

interface Props {
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
}

const FileDropzone: React.FC<Props> = ({
  onChange,
  accept = '*',
  multiple = false,
  label = 'Drop files here or click to browse',
  disabled = false,
}) => {
  const classes = useStyles();
  const [files, setFiles] = useState<File[]>([]);

  const handleDropzoneChange = useCallback(
    (newFiles: File[]) => {
      setFiles(newFiles);
      onChange(newFiles);
    },
    [onChange],
  );

  return (
    <DropzoneArea
      filesLimit={multiple ? undefined : 1}
      acceptedFiles={accept}
      showPreviewsInDropzone
      dropzoneClass={classes.dropzone}
      onChange={handleDropzoneChange}
      dropzoneText={label}
      disabled={disabled}
    />
  );
};

export default FileDropzone;
