import { onDownload, openAttachmentInShell } from './messageFunctions'
import React, { useRef, useState, useContext } from 'react'

import classNames from 'classnames'
import MessageBody from './MessageBody'
import MessageMetaData from './MessageMetaData'

import { ContextMenu, ContextMenuTrigger, MenuItem } from 'react-contextmenu'
import Attachment from '../attachment/messageAttachment'
import { MessageType, DCContact } from '../../../shared/shared-types'
import { attachment, isGenericAttachment } from '../attachment/Attachment'
import { useTranslationFunction, ScreenContext } from '../../contexts'
import { joinCall } from '../helpers/ChatMethods'
import { C } from 'deltachat-node/dist/constants'
import { getLogger } from '../../../shared/logger'

const log = getLogger('renderer/message')

const { openExternal } = window.electron_functions

type msgStatus = 'error' | 'sending' | 'draft' | 'delivered' | 'read' | ''

const Avatar = (
  contact: DCContact,
  onContactClick: (contact: DCContact) => void
) => {
  const { profileImage, color, displayName } = contact

  const onClick = () => onContactClick(contact)

  if (profileImage) {
    return (
      <div className='author-avatar' onClick={onClick}>
        <img alt={displayName} src={profileImage} />
      </div>
    )
  } else {
    const codepoint = displayName && displayName.codePointAt(0)
    const initial = codepoint
      ? String.fromCodePoint(codepoint).toUpperCase()
      : '#'
    return (
      <div
        className='author-avatar default'
        aria-label={displayName}
        onClick={onClick}
      >
        <div style={{ backgroundColor: color }} className='label'>
          {initial}
        </div>
      </div>
    )
  }
}

const ContactName = (props: {
  email: string
  name: string
  profileName?: string
  color: string
  onClick: (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void
}) => {
  const { email, name, profileName, color, onClick } = props

  const title = name || email
  const shouldShowProfile = Boolean(profileName && !name)
  const profileElement = shouldShowProfile ? (
    <span style={{ color: color }}>~{profileName || ''}</span>
  ) : null

  return (
    <span className='author' style={{ color: color }} onClick={onClick}>
      {title}
      {shouldShowProfile ? ' ' : null}
      {profileElement}
    </span>
  )
}

const Author = (
  contact: DCContact,
  onContactClick: (contact: DCContact) => void
) => {
  const { color, name, address } = contact

  return (
    <ContactName
      email={address}
      name={name}
      color={color}
      onClick={() => onContactClick(contact)}
    />
  )
}

const InlineMenu = (
  MenuRef: todo,
  showMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
  triggerId: string,
  props: {
    attachment: attachment
    message: MessageType | { msg: null }
    // onReply
    viewType: number
  }
) => {
  const { attachment, message, /*onReply,*/ viewType } = props
  const tx = useTranslationFunction()

  return (
    <div className='message-buttons'>
      {attachment && viewType !== 23 && (
        <div
          onClick={onDownload.bind(null, message.msg)}
          role='button'
          className='msg-button download hide-on-small'
          aria-label={tx('save')}
        />
      )}
      {/* <div
        onClick={onReply}
        role='button'
        className='msg-button reply hide-on-small'
      /> */}
      <ContextMenuTrigger id={triggerId} ref={MenuRef}>
        <div
          role='button'
          onClick={showMenu}
          className='msg-button menu'
          aria-label={tx('a11y_message_context_menu_btn_label')}
        />
      </ContextMenuTrigger>
    </div>
  )
}

const contextMenu = (
  props: {
    attachment: attachment
    direction: 'incoming' | 'outgoing'
    status: msgStatus
    onDelete: Function
    message: MessageType | { msg: null }
    text?: string
    // onReply:Function
    onForward: Function
    // onRetrySend: Function
    onShowDetail: Function
  },
  textSelected: boolean,
  link: string,
  triggerId: string
) => {
  const {
    attachment,
    direction,
    status,
    onDelete,
    message,
    text,
    // onReply,
    onForward,
    // onRetrySend,
    onShowDetail,
  } = props
  const tx = window.static_translate // don't use the i18n context here for now as this component is inefficient (rendered one menu for every message)

  // let showRetry = status === 'error' && direction === 'outgoing'

  return (
    <ContextMenu id={triggerId}>
      {attachment && isGenericAttachment(attachment) ? (
        <MenuItem onClick={openAttachmentInShell.bind(null, message.msg)}>
          {tx('open_attachment_desktop')}
        </MenuItem>
      ) : null}
      {link !== '' && (
        <MenuItem onClick={_ => navigator.clipboard.writeText(link)}>
          {tx('menu_copy_link_to_clipboard')}
        </MenuItem>
      )}
      {textSelected ? (
        <MenuItem
          onClick={_ => {
            navigator.clipboard.writeText(window.getSelection().toString())
          }}
        >
          {tx('menu_copy_selection_to_clipboard')}
        </MenuItem>
      ) : (
        <MenuItem
          onClick={_ => {
            navigator.clipboard.writeText(text)
          }}
        >
          {tx('menu_copy_to_clipboard')}
        </MenuItem>
      )}
      {attachment ? (
        <MenuItem onClick={onDownload.bind(null, message.msg)}>
          {tx('download_attachment_desktop')}
        </MenuItem>
      ) : null}
      {/*
      <MenuItem onClick={onReply}>
        {tx('reply_to_message_desktop')}
      </MenuItem>
       */}
      <MenuItem onClick={onForward}>{tx('menu_forward')}</MenuItem>
      <MenuItem onClick={onShowDetail}>{tx('more_info_desktop')}</MenuItem>
      {/* {showRetry ? (
        <MenuItem onClick={onRetrySend}>{tx('retry_send')}</MenuItem>
      ) : null} */}
      <MenuItem onClick={onDelete}>{tx('delete_message_desktop')}</MenuItem>
    </ContextMenu>
  )
}

const Message = (props: {
  direction: 'incoming' | 'outgoing'
  id: number
  timestamp: number
  viewType: number
  conversationType: 'group' | 'direct'
  message: MessageType
  text?: string
  disableMenu?: boolean
  status: msgStatus
  attachment: attachment
  onContactClick: (contact: DCContact) => void
  onClickMessageBody: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => void
  onShowDetail: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  padlock: boolean
  onDelete: () => void
  onForward: () => void
  /* onRetrySend */
}) => {
  const {
    direction,
    id,
    timestamp,
    viewType,
    conversationType,
    message,
    text,
    disableMenu,
    status,
    attachment,
    onContactClick,
    onClickMessageBody,
    onShowDetail,
  } = props
  const tx = useTranslationFunction()

  const authorAddress = message.contact.address

  // This id is what connects our triple-dot click with our associated pop-up menu.
  //   It needs to be unique.
  const triggerId = String(id || `${authorAddress}-${timestamp}`)

  const MenuRef = useRef(null)
  const [textSelected, setTextSelected] = useState(false)
  const [link, setLink] = useState('')

  const showMenu: (
    event: React.MouseEvent<HTMLDivElement | HTMLAnchorElement, MouseEvent>
  ) => void = event => {
    if (MenuRef.current) {
      setTextSelected(window.getSelection().toString() !== '')
      setLink((event.target as any).href || '')
      MenuRef.current.handleContextClick(event)
    }
  }

  const menu = !disableMenu && InlineMenu(MenuRef, showMenu, triggerId, props)

  // TODO another check - don't check it only over string
  const longMessage = /\[.{3}\]$/.test(text)

  return (
    <div
      onContextMenu={showMenu}
      className={classNames(
        'message',
        direction,
        { 'type-sticker': viewType === 23 },
        { error: status === 'error' },
        { forwarded: message.msg.isForwarded }
      )}
    >
      {conversationType === 'group' &&
        direction === 'incoming' &&
        Avatar(message.contact, onContactClick)}
      {menu}
      <div onContextMenu={showMenu} className='msg-container'>
        {message.msg.isForwarded && (
          <div className='forwarded-indicator'>{tx('forwarded_message')}</div>
        )}
        {direction === 'incoming' &&
          conversationType === 'group' &&
          Author(message.contact, onContactClick)}
        <div
          className={classNames('msg-body', {
            'msg-body--clickable': onClickMessageBody,
          })}
          onClick={props.onClickMessageBody}
        >
          <Attachment
            {...{
              attachment,
              text,
              conversationType,
              direction,
              message,
            }}
          />

          <div dir='auto' className='text'>
            {message.msg.isSetupmessage ? (
              tx('autocrypt_asm_click_body')
            ) : (
              <MessageBody text={text || ''} />
            )}
          </div>
          {longMessage && <button onClick={onShowDetail}>...</button>}
          <MessageMetaData {...props} />
        </div>
      </div>
      <div
        onClick={ev => {
          ev.stopPropagation()
        }}
      >
        {contextMenu(props, textSelected, link, triggerId)}
      </div>
    </div>
  )
}

export default Message

export const CallMessage = (props: {
  direction: 'incoming' | 'outgoing'
  id: number
  timestamp: number
  viewType: number
  conversationType: 'group' | 'direct'
  message: MessageType
  text?: string
  disableMenu?: boolean
  status: msgStatus
  attachment: attachment
  onContactClick: (contact: DCContact) => void
  onClickMessageBody: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => void
  onShowDetail: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  padlock: boolean
  onDelete: () => void
  onForward: () => void
}) => {
  const {
    direction,
    conversationType,
    message,
    status,
    onContactClick,
    id,
  } = props
  const tx = window.static_translate

  const screenContext = useContext(ScreenContext)

  const openCall = (messageId: number) => {
    joinCall(screenContext, messageId)
  }

  return (
    <div
      className={classNames(
        'message',
        direction,
        { error: status === 'error' },
        { forwarded: message.msg.isForwarded }
      )}
    >
      {conversationType === 'group' &&
        direction === 'incoming' &&
        Avatar(message.contact, onContactClick)}
      <div className='msg-container'>
        {message.msg.isForwarded && (
          <div className='forwarded-indicator'>{tx('forwarded_message')}</div>
        )}
        {direction === 'incoming' &&
          conversationType === 'group' &&
          Author(message.contact, onContactClick)}
        <div className={classNames('msg-body')}>
          <div dir='auto' className='text'>
            <div className='call-inc-text'>
              <b>{tx('video_hangout_invitation')}</b>
              <div>
                <button
                  className='phone-accept-button'
                  onClick={openCall.bind(null, id)}
                >
                  {direction === 'incoming' ? tx('join') : tx('rejoin')}
                </button>
              </div>
              {message.msg.videochatType === C.DC_VIDEOCHATTYPE_UNKNOWN &&
                tx('videochat_will_open_in_your_browser')}
            </div>
          </div>

          <MessageMetaData {...props} />
        </div>
      </div>
    </div>
  )
}
