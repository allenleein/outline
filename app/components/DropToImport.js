// @flow
import invariant from "invariant";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import Dropzone from "react-dropzone";
import { withRouter, type RouterHistory, type Match } from "react-router-dom";
import styled, { css } from "styled-components";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import LoadingIndicator from "components/LoadingIndicator";

const EMPTY_OBJECT = {};
let importingLock = false;

type Props = {
  children: React.Node,
  collectionId: string,
  documentId?: string,
  ui: UiStore,
  documents: DocumentsStore,
  disabled: boolean,
  location: Object,
  match: Match,
  history: RouterHistory,
  staticContext: Object,
};

@observer
class DropToImport extends React.Component<Props> {
  @observable isImporting: boolean = false;

  onDropAccepted = async (files = []) => {
    if (importingLock) return;

    this.isImporting = true;
    importingLock = true;

    try {
      let collectionId = this.props.collectionId;
      const documentId = this.props.documentId;
      const redirect = files.length === 1;

      if (documentId && !collectionId) {
        const document = await this.props.documents.fetch(documentId);
        invariant(document, "Document not available");
        collectionId = document.collectionId;
      }

      for (const file of files) {
        const doc = await this.props.documents.import(
          file,
          documentId,
          collectionId,
          { publish: true }
        );

        if (redirect) {
          this.props.history.push(doc.url);
        }
      }
    } catch (err) {
      this.props.ui.showToast(`Could not import file. ${err.message}`);
    } finally {
      this.isImporting = false;
      importingLock = false;
    }
  };

  render() {
    const { documents } = this.props;

    if (this.props.disabled) return this.props.children;

    return (
      <Dropzone
        accept={documents.importFileTypes.join(", ")}
        onDropAccepted={this.onDropAccepted}
        style={EMPTY_OBJECT}
        noClick
        multiple
      >
        {({
          getRootProps,
          getInputProps,
          isDragActive,
          isDragAccept,
          isDragReject,
        }) => (
          <DropzoneContainer {...getRootProps()} {...{ isDragActive }}>
            <input {...getInputProps()} />
            {this.isImporting && <LoadingIndicator />}
            {this.props.children}
          </DropzoneContainer>
        )}
      </Dropzone>
    );
  }
}

const DropzoneContainer = styled("div")`
  border-radius: 4px;

  ${({ isDragActive, theme }) =>
    isDragActive &&
    css`
      background: ${theme.slateDark};
      a {
        color: ${theme.white} !important;
      }
      svg {
        fill: ${theme.white};
      }
    `}
`;

export default inject("documents", "ui")(withRouter(DropToImport));
