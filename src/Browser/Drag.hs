{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}
module Browser.Drag where

import JSDOM.Types (Element, MouseEvent, Event, FromJSVal (fromJSVal), ToJSVal (toJSVal), HTMLElement (HTMLElement), HTMLImageElement (HTMLImageElement))
import Language.Javascript.JSaddle (JSM, (!), (<#), isUndefined, ghcjsPure, jsg, new)
import Universum (Text, when, (==), ($), Maybe (Just, Nothing), (=<<), Applicative (pure), (-), forM_, whenM, null, show, (||), (/=), (<$>), Semigroup ((<>)), (+), fromIntegral, (<=), (>=), (<), (>), round, Int, (.), isNothing, NonEmpty ((:|)))
import JSDOM.Generated.Element (getId, setId, getClassList, setAttribute, matches, getElementsByClassName, closest, getClientWidth, getClientHeight, getAttribute)
import Browser.Browser (generateId, getElementById)
import JSDOM.Generated.HTMLCollection (item, getLength)
import JSDOM.Generated.DOMTokenList (add, remove)
import JSDOM.Generated.MouseEvent (getDataTransfer, getClientX, getClientY)
import JSDOM.Generated.DataTransfer (setData, getData, setDragImage)
import Browser.Events (addEventListener)
import JSDOM.Generated.Event (stopPropagation, getTarget)
import JSDOM (currentDocument, currentWindow)
import JSDOM.Generated.ElementCSSInlineStyle (getStyle)
import JSDOM.Generated.CSSStyleDeclaration (getPropertyValue, setProperty)
import JSDOM.Generated.HTMLElement (getOffsetTop, getOffsetLeft, getOffsetHeight, getOffsetWidth)
import JSDOM.Generated.Node (getParentElement)
import JSDOM.Generated.ParentNode (querySelector)
import FFI (debug, warn)
import Data.Text (pack, unpack)
import Data.Maybe (fromJust)
import Text.Read (read)
import Monadic (tryArray, tryValue)

dragStart :: Text -> MouseEvent -> JSM ()
dragStart identifier ev = do
  Just dt <- getDataTransfer ev
  d :: Text <- getData dt "rafiikka/tunniste"
  case d of
    x | null x -> do
      _ <- warn $ pack "No dataTrasfer rafiikka/tunniste?"
      pure ()
    x -> do
      targ <- getTarget ev
      tryValue (pack "target") targ $ \target -> do
        targetElem <- HTMLElement <$> toJSVal target
        el <- closest targetElem ".dragContext"
        tryValue "closest .dragContext" el $ \elem -> do
          id <- ensureId elem

          (`add` ["dragging"]) =<< getClassList elem
          Just win <- currentWindow
          cx <- getClientX ev
          cy <- getClientY ev
          let ed = [id, show cx, show cy]
          win <# "elementDragged" $ ed
          _ <- debug $ pack $ "Set elementDragged to: " <> show ed
          img <- new (jsg "Image") ()
          setDragImage dt (Just $ HTMLImageElement img) 0 0

          htmlElem <- HTMLElement <$> toJSVal elem
          style <- getStyle htmlElem
          w <- style `getPropertyValue` "width"
          h <- style `getPropertyValue` "height"
          b <- style `getPropertyValue` "bottom"
          r <- style `getPropertyValue` "right"
          when (w == "auto" || h == "auto" || b /= "auto" || r /= "auto") $ do
            ot <- getOffsetTop htmlElem
            ol <- getOffsetLeft htmlElem
            cw <- getClientWidth htmlElem
            ch <- getClientHeight htmlElem
            setProperty style "width" (show cw <> "px") (Nothing @Text)
            setProperty style "height" (show ch <> "px") (Nothing @Text)
            setProperty style "right" "auto" (Nothing @Text)
            setProperty style "bottom" "auto" (Nothing @Text)
            setProperty style "top" (show ot <> "px") (Nothing @Text)
            setProperty style "left" (show ol <> "px") (Nothing @Text)

ensureId :: Element -> JSM Text
ensureId elem = do
  i <- getAttribute elem "id"
  when (isNothing i || fromJust i == "") $ do
    newId <- generateId
    setId elem newId
  getId elem

dragEnd :: MouseEvent -> JSM ()
dragEnd ev = do
  Just win <- currentWindow
  Just doc <- currentDocument
  ed <- win ! "elementDragged"
  whenM (ghcjsPure $ isUndefined ed) $
    win <# "elementDragged" $ ["fooid", "0", "0"]
  ed2 <- win ! "elementDragged"
  eds :: Maybe (NonEmpty Text) <- fromJSVal ed2
  tryValue "elementDragged was not a non-empty array?" eds $ \(first:|_) -> do
    e <- getElementById first
    tryValue (pack "element") e $ \x -> do
      (`remove` ["dragging"]) =<< getClassList x
      pure ()

drag :: Element -> MouseEvent -> JSM ()
drag elem ev = do
  par <- getParentElement elem
  tryValue "parentElement@drag" par $ \parent -> do
    Just win <- currentWindow
    ed <- win ! "elementDragged"
    eds <- tryArray (pack "elementDragged") ed
    tryValue "elementDragged was not an array" eds $ \xx -> do
      case xx of
        [id, clientX, clientY] -> do
          evClientX <- getClientX ev
          evClientY <- getClientY ev
          
          htmlElem <- HTMLElement <$> toJSVal elem
          
          let dy = (if evClientY == 0 then read (unpack clientY) else fromIntegral evClientY) - read (unpack clientY)
          let dx = (if evClientX == 0 then read (unpack clientX) else fromIntegral evClientX) - read (unpack clientX)
          top <- (+dy) <$> getOffsetTop htmlElem
          left <- (+dx) <$> getOffsetLeft htmlElem
          
          header <- querySelector elem ":scope > .header"
          headerHeight <- case header of
            Just h  -> getOffsetHeight . HTMLElement =<< toJSVal h
            Nothing -> pure 0
          
          left2 <- if left <= 1
                    then do
                      (`add` ["snapped"]) =<< getClassList elem
                      (`add` ["left"]) =<< getClassList elem
                      pure 0
                    else pure left
          top2 <- if top <= headerHeight+1
                  then do
                    (`add` ["snapped"]) =<< getClassList elem
                    (`add` ["top"]) =<< getClassList elem
                    pure headerHeight
                  else pure top
          
          parentHtml <- HTMLElement <$> toJSVal parent
          pow <- getOffsetWidth parentHtml
          ow <- getOffsetWidth htmlElem
          
          left3 <- if left2 >= pow - ow - 1
                  then do
                    (`add` ["snapped"]) =<< getClassList elem
                    (`add` ["right"]) =<< getClassList elem
                    pure $ pow - ow
                  else pure left2
          
          poh <- getOffsetHeight parentHtml
          oh <- getOffsetHeight htmlElem
          
          top3 <- if top2 >= poh - oh - 1
                  then do
                    (`add` ["snapped"]) =<< getClassList elem
                    (`add` ["bottom"]) =<< getClassList elem
                    pure $ poh - oh
                  else pure top2
          
          when (dx < 0) $ do
            (`remove` ["right"]) =<< getClassList elem
            (`remove` ["snapped"]) =<< getClassList elem

          when (dx > 0) $ do
            (`remove` ["left"]) =<< getClassList elem
            (`remove` ["snapped"]) =<< getClassList elem
          
          when (dy < 0) $ do
            (`remove` ["bottom"]) =<< getClassList elem
            (`remove` ["snapped"]) =<< getClassList elem
          
          when (dy > 0) $ do
            (`remove` ["top"]) =<< getClassList elem
            (`remove` ["snapped"]) =<< getClassList elem
          
          style <- getStyle htmlElem
          setProperty style "left" (show (round left3 :: Int) <> "px") (Nothing @Text)
          setProperty style "top" (show (round top3 :: Int) <> "px") (Nothing @Text)
          
          evClientX2 <- getClientX ev
          evClientY2 <- getClientY ev
          win <# "elementDragged" $ ([id, show evClientX2, show evClientY2] :: [Text])
          stopPropagation ev
          pure ()
        _ -> do
          _ <- warn (pack "elementDragged was not 3 elements?")
          pure ()

dragElement :: Element -> Text -> JSM ()
dragElement elem identifier = do
    (`add` ["dragContext"]) =<< getClassList elem

    let makeDraggable e = do
          _ <- debug (pack "Making draggable")
          elemId <- ensureId e
          e `setAttribute` "draggable" $ "true"
          addEventListener e "dragstart" $ \ev -> do
            assignDataTransfer elemId (pure identifier) ev
            dragStart identifier ev
          addEventListener e "dragend" dragEnd
          addEventListener e "drag" $ drag elem

    whenM (matches elem ".draghandle") $ makeDraggable elem

    found <- getElementsByClassName elem "draghandle"
    items <- getLength found
    forM_ [0..items-1] $ \i -> do
        Just el <- item found i
        whenM (matches el ".draghandle") $ makeDraggable el

moveElement :: Element -> JSM Text -> JSM ()
moveElement elem identifierF = do
  elemId <- ensureId elem

  c <- getElementsByClassName elem "title"
  (Just e) <- item c 0
  (`add` ["move"]) =<< getClassList e
  e `setAttribute` "draggable" $ "true"
  addEventListener e "dragstart" $ \(ev :: MouseEvent) -> do
    assignDataTransfer elemId identifierF ev
    
  addEventListener @Event e "drag"    stopPropagation
  addEventListener @Event e "dragend" stopPropagation
  pure ()

assignDataTransfer :: Text -> JSM Text -> MouseEvent -> JSM ()
assignDataTransfer elemId identifierF ev = do
  dt <- getDataTransfer ev
  tryValue "No datatransfer?" dt $ \x -> do
      ident <- identifierF
      setData x "rafiikka/tunniste" ident
      setData x "rafiikka/elementid" elemId
      pure ()