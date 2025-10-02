import { useState, useEffect, useContext, createContext } from 'react';

// Lexical Editor Imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot, $insertNodes, $createParagraphNode, TextNode } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import AutoLinkPlugin from "../../plugins/AutoLinkPlugin";
import ToolbarPlugin from "../../plugins/ToolbarPlugin";
import { ExtendedTextNode } from "../../plugins/ExtendedTextNode";

// Lexical Editor Configuration
const editorConfig = {
    namespace: 'TapasDescriptionEditor',
    theme: {
        // Basic theme for styling content editable
        // You might want to expand this with more specific styles
        placeholder: "editor-placeholder",
        paragraph: "editor-paragraph",
        quote: "editor-quote",
        heading: {
            h1: "editor-heading-h1",
            h2: "editor-heading-h2",
            h3: "editor-heading-h3",
            h4: "editor-heading-h4",
            h5: "editor-heading-h5"
        },
        text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
        },
        link: 'editor-link',
        list: {
            nested: {
                listitem: "editor-nested-listitem"
            },
            ol: "editor-list-ol",
            ul: "editor-list-ul",
            listitem: "editor-listitem"
        },
    },
    onError(error) {
        console.error(error);
    },
    nodes: [
        ExtendedTextNode,
        {
            replace: TextNode,
            with: (node) => new ExtendedTextNode(node.__text),
            withKlass: ExtendedTextNode,
        },
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        AutoLinkNode,
        LinkNode
    ]
};

// Locale Context
export const LocaleContext = createContext({
    locale: 'en',
    setLocale: () => {},
    t: (key, ...args) => key // Default translation function
});

// RichTextEditor Component
export const RichTextEditor = ({ initialContent, onEditorStateChange }) => {
    const { t } = useContext(LocaleContext);

    // This function will be used to create the initial state of the editor.
    // It is wrapped in a useMemo to ensure it's only created once.
    const initialConfig = {
        ...editorConfig,
        editorState: (editor) => {
            const root = $getRoot();
            if (initialContent) {
                const parser = new DOMParser();
                const dom = parser.parseFromString(initialContent, "text/html");
                const nodes = $generateNodesFromDOM(editor, dom);
                root.clear();
                $insertNodes(nodes);
            } else {
                root.clear();
                root.append($createParagraphNode());
            }
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="relative border border-gray-300 dark:border-gray-600 rounded-md">
                <ToolbarPlugin />
                <div className="editor-inner">
                    <RichTextPlugin
                        contentEditable={<ContentEditable className="editor-input min-h-[150px] p-3 outline-none resize-y overflow-auto bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-b-md" />}
                        placeholder={<div className="editor-placeholder">{t('enterDescription')}...</div>}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <AutoLinkPlugin />
                    <OnChangePlugin onChange={onEditorStateChange} />
                </div>
            </div>
        </LexicalComposer>
    );
};

// Helper to convert Lexical EditorState to HTML for display
export const LexicalHtmlRenderer = ({ editorStateHtml }) => {
    const [htmlContent, setHtmlContent] = useState('');

    useEffect(() => {
        if (editorStateHtml) {
            setHtmlContent(editorStateHtml);
        } else {
            setHtmlContent('');
        }
    }, [editorStateHtml]);

    return (
        <div className="" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    );
};

export default RichTextEditor;
