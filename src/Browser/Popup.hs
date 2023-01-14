{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE OverloadedStrings #-}
module Browser.Popup
  (createPopup,
   noOffset,
   Offset
  )
where

import JSDOM (currentDocument)
import Language.Javascript.JSaddle (JSM, ToJSVal (toJSVal), FromJSVal (fromJSVal))
import Universum hiding (div)
import JSDOM.Generated.ElementCSSInlineStyle (getStyle)
import JSDOM.Generated.HTMLElement (HTMLElement, setInnerText, setTitle)
import JSDOM.Generated.CSSStyleDeclaration (setProperty)
import Browser.Browser (createHTMLElement)
import JSDOM.Generated.Node (appendChild, getParentNode, removeChild, getChildNodes)
import JSDOM.Generated.Element (getClassList)
import JSDOM.Generated.DOMTokenList (add)
import JSDOM.Generated.EventTarget (addEventListener)
import JSDOM.Generated.EventListener (EventListener(EventListener))
import FFI (procedure)
import JSDOM.Generated.ChildNode (after, ChildNode)
import JSDOM.Generated.NodeList (item,getLength)
import Control.Applicative.HT (lift4)
import Monadic (propFromJSVal, doFromJSVal)
import Yleiset ()
import JSDOM.Generated.Document (getBody)

data Offset = Offset {
  left   :: Maybe Text,
  top    :: Maybe Text,
  right  :: Maybe Text,
  bottom :: Maybe Text
}

instance FromJSVal Offset where
  fromJSVal = doFromJSVal "Offset" $
    lift4 Offset <$> propFromJSVal "left"
                 <*> propFromJSVal "top"
                 <*> propFromJSVal "right"
                 <*> propFromJSVal "bottom"

noOffset :: Offset
noOffset = Offset Nothing Nothing Nothing Nothing


-- TODO: popupss should be built in Shpadoinkle from a model...
createPopup :: Maybe Text -> Offset -> Maybe (JSM ()) -> JSM (HTMLElement,HTMLElement)
createPopup titleText Offset{..} onClose = do
  Just doc <- currentDocument
  Just body <- getBody doc
  container <- createHTMLElement "div"
  _ <- body `appendChild` container

  style <- getStyle container
  whenJust left $ \x ->
    setProperty style ("left" :: Text) x (Nothing @Text)
  whenJust top $ \x ->
    setProperty style ("top" :: Text) x (Nothing @Text)
  whenJust right $ \x ->
    setProperty style ("right" :: Text) x (Nothing @Text)
  whenJust bottom $ \x ->
    setProperty style ("bottom" :: Text) x (Nothing @Text)
  
  header <- createHTMLElement "div"
  (`add` ["header" :: Text]) =<< getClassList header
  (`add` ["draghandle" :: Text]) =<< getClassList header
  _ <- container `appendChild` header

  title <- createHTMLElement "div"
  (`add` ["title" :: Text]) =<< getClassList title
  whenJust titleText $ setInnerText title
  _ <- header `appendChild` title

  close <- createHTMLElement "div"
  (`add` ["close" :: Text]) =<< getClassList close
  setTitle close ("Close window" :: Text)
  setInnerText close ("x" :: Text)
  listener <- toJSVal $ procedure $ do
    whenJust onClose id
    Just parent <- getParentNode container
    _ <- parent `removeChild` container
    pure ()
  addEventListener close ("click" :: Text) (Just $ EventListener listener) False
  _ <- header `appendChild` close

  onDragEnd <- toJSVal $ procedure $ do
    moveToTop container
  addEventListener container ("dragend" :: Text) (Just $ EventListener onDragEnd) False
  
  pure (container,header)

moveToTop :: HTMLElement -> JSM ()
moveToTop container = do
  parent <- getParentNode container
  whenJust parent $ \p -> do
    popups <- getChildNodes p
    popupCount <- getLength popups
    Just lastNode <- popups `item` (popupCount-1)
    Just lastChildNode <- fromJSVal @ChildNode =<< toJSVal lastNode
    lastChildNode `after` [container]