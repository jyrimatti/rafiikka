{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}

module Browser (
    getElementById,
    setTimeout,
    debug
) where

import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2, JSString)
import JSDOM (currentDocument)
import JSDOM.Types (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Universum hiding (Element)
import Data.Time (NominalDiffTime)
import qualified Shpadoinkle.Console as SC (debug)

debug :: Text -> JSM ()
debug = SC.debug @Show

getElementById :: Text -> JSM (Maybe Element)
getElementById id_ = do
  debug "getElementById"
  Just doc <- currentDocument
  doc `querySelector` ("#" <> id_)

setTimeout :: NominalDiffTime -> JSM () -> JSM ()
setTimeout timeout callback = do
  debug "setTimeout"
  _ <- jsg2 @JSString "setTimeout" (procedure callback) $ round @NominalDiffTime @Int (timeout * 1000)
  pure ()
